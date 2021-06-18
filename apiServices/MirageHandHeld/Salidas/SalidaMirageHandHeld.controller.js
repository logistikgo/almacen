'use strict'
const mongoose = require('mongoose');
const Entrada = require('../../Entradas/Entrada.model');
const Producto = require('../../Producto/Producto.model');
const ProdcutoController = require('../../Producto/Producto.controller');
const Partida = require('../../Partida/Partida.controller');
const PartidaModel = require('../../Partida/Partida.model');
const Helper = require('../../../services/utils/helpers');
const MovimientoInventarioModel = require('../../MovimientosInventario/MovimientoInventario.model');
const dateFormat = require('dateformat');
const Pasillo = require('../../Pasillos/Pasillo.model');
const Posicion = require('../../Posicion/Posicion.model');

const { formatPosicion, createDateForForPartida, separarResponsePorLicencia, isSalidaAlreadyCreated, createPosition } = require('../utils/helpers')
const { movimientosSalidasMirage } = require('../utils/MirageRequest.repository');
const EntradaModel = require('../../Entradas/Entrada.model');
const Salida = require('../../Salidas/Salida.model');
const ProductoModel = require('../../Producto/Producto.model');
const mailer = require('../../../services/email/mailer');
const bodyMailTemplate = require('../../../services/email/templateCreator');
const cheerio = require('cheerio');


async function salidaMirageHandHeld(req, res){

    const CLIENTE_FISCAL_ID = "6074a7d60e45340e283a4b27";
    const ALMACEN_ID = "6074a91b0e45340e283a4b28";
    const SUCURSAL_ID = "5e3342f322b5651aecafea05"

    const SALIDAS_MIRAGE_JSON = separarResponsePorLicencia(await movimientosSalidasMirage());
    
    for(let salidaMirage of SALIDAS_MIRAGE_JSON){
        const licencias = salidaMirage.LICENCIAS;
        const idContenedor = salidaMirage.DOCUMENTO;
        let usuario = "";
        let partidasEnSalida = [];
        if(!await isSalidaAlreadyCreated(idContenedor)){
           
            for(let licencia of licencias){
                const { LICENCIA, ARTICULO, LOCACION, QTY, USUARIO } = licencia;
                usuario = USUARIO;
                const posicion = await formatPosicion(LOCACION, ALMACEN_ID);
                let licenciasDisponibles;
                
                licenciasDisponibles = await PartidaModel.findOne({
                                                isEmpty: false, 
                                                status: "ASIGNADA",
                                                clave: ARTICULO, 
                                                lote: LICENCIA,
                                                "embalajesxSalir.unidades": QTY,
                                                "posiciones.nivel_id": posicion.nivel_id,
                                                "posiciones.pasillo_id": posicion.pasillo_id,
                                                "posiciones.posicion_id": posicion.posicion_id,
                                                "entrada_id": {$exists: true}
                                                }).exec();
                
                if(licenciasDisponibles === null){
                    licenciasDisponibles = await PartidaModel.findOne({
                        isEmpty: false, 
                        status: "ASIGNADA",
                        clave: ARTICULO, 
                        lote: LICENCIA,
                        "posiciones.nivel_id": posicion.nivel_id,
                        "posiciones.pasillo_id": posicion.pasillo_id,
                        "posiciones.posicion_id": posicion.posicion_id,
                        "entrada_id": {$exists: true}
                        }).exec();
                }                                


                licenciasDisponibles.UnidadesPedidas = {"unidades": QTY};
                await licenciasDisponibles.save();                                    
                partidasEnSalida.push(licenciasDisponibles);                               
                console.log(licenciasDisponibles)
            }

            await createSalidaMirage({
                almacen_id: ALMACEN_ID,
                clienteFiscal_id: CLIENTE_FISCAL_ID,
                sucursal_id: SUCURSAL_ID,
                partidas: partidasEnSalida,
                idContenedor,
                usuario
            })

            console.log(salidaMirage);
        }

    }

    return res.status(200).send({statusCode: 200, response: {message: "OK", SALIDAS_MIRAGE_JSON}});

}

async function createSalidaMirage(salidaInformation){

    /**
     * salida_id: Number,
		almacen_id: {
			type: Schema.ObjectId,
			ref: "Almacen"
		},
		sucursal_id: {
			type: Schema.ObjectId,
			ref: 'Sucursal'
		},
		clienteFiscal_id: {
			type: Schema.ObjectId,
			ref: 'ClienteFiscal'
		},
		salidaBabel_id: {
			type: Schema.ObjectId,
			ref: 'SalidasBabel'
		},
		folio: String,
		stringFolio: String,
		item: String,
		tipo: String,
		embarco: String,
		referencia: String,
		po: String,
		numeroOrden: String,
		numeroRastreo: String,
		destinatario: String,
		transportista: String,
		operador: String,
		tipoUnidad: String,
		placasTrailer: String,
		placasRemolque: String,
		sello: String,
		horaSello: Date,
		fechaReciboRemision: Date,
		tiempoCarga_id: {
			type: Schema.ObjectId,
			ref: "TiempoCargaDescarga"
		},
		fechaSalida: Date,
		entrada_id: [
			{
				type: Schema.ObjectId,
				ref: "Entrada"
			}
		],
		partidas: [
			{
				type: Schema.ObjectId,
				ref: 'Partida'
			}
		],
		fechaAlta: {
			type: Date,
			default: Date.now
		},
		usuarioSalida_id: Number,
		usuarioAlta_id: Number,
		nombreUsuario: String,
		//DEPURAR LOS SIGUIENTES CAMPOS (AUN SE USAN?)
		valor: Number,
		cliente: String,
		idClienteFiscal: Number,
		idSucursal: Number,
		idSucursal: Number,
		//CAMPOS AUXILIARES
		statusPedido:{type:String, default: "SIN_ASIGNAR"},
		//partidas : {}
     */

        try {
            
            const { almacen_id, clienteFiscal_id, sucursal_id, partidas, idContenedor, usuario } = salidaInformation
        
            //creacion de la salida   
            let nSalida = new Salida();
            nSalida.fechaSalida = new Date();
            nSalida.almacen_id=mongoose.Types.ObjectId(almacen_id);
            nSalida.clienteFiscal_id = clienteFiscal_id;
            nSalida.sucursal_id = sucursal_id;
            nSalida.status = "APLICADA";//replace arrival
            nSalida.tipo = "NORMAL";
            nSalida.partidas = partidas.map(partida => partida._id) //Obtener los ids de las partidas;
            nSalida.nombreUsuario = "MIRAGE HANDHELD";
            nSalida.usuario = usuario;			
            nSalida.referencia = idContenedor;
            nSalida.factura = idContenedor;
            nSalida.item = idContenedor;
            nSalida.fechaAlta = new Date();
            const partidasDocument = await PartidaModel.find({_id:{$in: partidas}}).exec();
            nSalida.entrada_id = [...new Set(partidasDocument.map(partida => partida.entrada_id.toString()))];

            const cantidadSalidas = await Salida.countDocuments({clienteFiscal_id: clienteFiscal_id}).exec() + 1;

            nSalida.idSalida = cantidadSalidas;
            nSalida.folio = cantidadSalidas;
            nSalida.stringFolio = await Helper.getStringFolio(nSalida.folio, nSalida.clienteFiscal_id, 'O', false);
           
            await nSalida.save().then( async (salida) => {
 
                await saveSalidasEnEntradaMirage(salida.entrada_id, salida._id);

                await put(partidasDocument, salida)

                await crearMovimientos(salida, -1, "SALIDA");

               
            })


        } catch (error) {
            console.error(error);
        }

}

/* Guarda para cada partida, las cantidades restantes y updatea la Entrada isEmpty a true
si todas las partidas estan vacias */
async function put(arrPartidas, salida) {
    var arrPartidas_id = [];
    console.log(arrPartidas);
    
    for(let partida of arrPartidas){
        let partidaClone = {...partida._doc};
       
        let embalajesEnSalidaxPosicion = await formatPosicion(createPosition(partida.posiciones[0]), salida.almacen_id,partidaClone.UnidadesPedidas );
        embalajesEnSalidaxPosicion.embalajes = partidaClone.UnidadesPedidas
        arrPartidas_id.push(partidaClone._id);
        
        let jsonSalida_id = {
            salida_id: salida._id,
            embalajes: partidaClone.UnidadesPedidas,
            salidaxPosiciones: embalajesEnSalidaxPosicion
        };
       
        partida.salidas_id.push(jsonSalida_id);

        const cantidadADescontar = partida.UnidadesPedidas.unidades;
        partida.embalajesxSalir.unidades -= cantidadADescontar;
        partida.posiciones[0].embalajesxSalir.unidades -= cantidadADescontar;

            if(partida.embalajesxSalir.unidades === 0){
                partida.isEmpty = true;
                partida.posiciones[0].isEmpty = true;          
    }
            let changes = {
                salidas_id: partida.salidas_id,
                embalajesxSalir: partidaClone.embalajesxSalir,
                posiciones: partida.posiciones,
                isEmpty: partida.isEmpty
            };
            await PartidaModel.updateOne({ _id: partida._id }, { $set: changes }).exec();
            await updateExistenciaPosicion(-1, partida.posiciones[0], partida.producto_id);
    }

}

async function saveSalidasEnEntradaMirage(entrada_id, salida_id) {
	let entradas = await Entrada.find({ _id: { $in: entrada_id } }).exec();

    for(let entrada of entradas){
        entrada.salidas_id.push(salida_id);
		let jEdit = {
			salidas_id: entrada.salidas_id
		};
	//	console.log(jEdit);
    await Entrada.updateOne({ _id: entrada._id }, { $set: jEdit }).exec();

    }
}


async function updateExistenciaPosicion(signo, posicionxPartida, producto_id){

    try {
        
    const posicion_id = posicionxPartida.posicion_id;
    const nivelNombre = posicionxPartida.nivel;

    const posicionDocument = await Posicion.findById(posicion_id).exec();

    const nivelDocument = posicionDocument.niveles.find(nivel => nivel.nombre === nivelNombre);

    const productIndex = nivelDocument.productos.findIndex(producto => producto.producto_id.toString() === producto_id.toString());
    nivelDocument.productos.splice(productIndex, 1);
    
    await posicionDocument.save().then(posicion => {
        console.log("Posicion editada correctamente");
    })

    console.log(producto);
    } catch (error) {
        
    }
}

async function crearMovimientos(salida, signo, tipo){
    
    const partidas = salida.partidas;
    const partidasDocument = await PartidaModel.find({_id:{$in: partidas}}).exec();

    for(let partida of partidasDocument){
        const movimientoInventario = {
            "_id" : mongoose.Types.ObjectId(),
            "posiciones" : partida.posiciones,
            "producto_id" : partida.producto_id,
            "salida_id" : salida._id,
            "fechaMovimiento" : new Date(),
            "embalajes" : partida.UnidadesPedidas,
            "signo" : signo,
            "tipo" : tipo,
            "clienteFiscal_id" : salida.clienteFiscal_id,
            "sucursal_id" : salida.sucursal_id,
            "almacen_id" : salida.almacen_id,
            "referencia" : salida.factura,
        }
        
        let movimientoInventarioDocument = new MovimientoInventarioModel(movimientoInventario);

        await updateExistencia(partida);


    await movimientoInventarioDocument.save().then(async (movimiento) => {
        console.log("Movimiento guardado");
    });


    }

    async function updateExistencia(partida){
        
        const currentProducto = await ProductoModel.findOne({"_id": partida.producto_id});

        currentProducto.embalajes.unidades -= partida.UnidadesPedidas.unidades;    
        
        currentProducto.fechaUltimaSalida = new Date();

        await ProductoModel.updateOne({"_id":currentProducto._id },  {$set: { 
            "embalajes.unidades": currentProducto.embalajes.unidades,
            "fechaUltimaSalida": currentProducto.fechaUltimaEntrada}})
    }

}


module.exports = {
    salidaMirageHandHeld
}