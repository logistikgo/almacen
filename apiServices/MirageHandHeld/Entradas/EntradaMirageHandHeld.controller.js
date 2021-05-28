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

const { formatPosicion, createDateForForPartida, separarResponsePorLicencia, isEntradaAlreadyCreated } = require('../utils/helpers')
const { movimientosEntradasMirage } = require('../utils/MirageRequest.repository');
const EntradaModel = require('../../Entradas/Entrada.model');
const ProductoModel = require('../../Producto/Producto.model');
const mailer = require('../../../services/email/mailer');
const bodyMailTemplate = require('../../../services/email/templateCreator');
const cheerio = require('cheerio');

async function entradaMirageHandHeld(req, res){

    //Se obtiene el token diractamente del WS de Mirage
    
    const CLIENTE_FISCAL_ID = "6074a7d60e45340e283a4b27";
    const ALMACEN_ID = "6074a91b0e45340e283a4b28";
    const SUCURSAL_ID = "5e3342f322b5651aecafea05"    
    
    const ENTRADA_MIRAGE_JSON = separarResponsePorLicencia(await movimientosEntradasMirage());
    
    const datosTable = ENTRADA_MIRAGE_JSON;    
    let partidasMirage = [];
    let remisionesCreadas = [];
        for (let dato of datosTable) {
            const licencias = dato.LICENCIAS;
            const idContenedor = dato.DOCUMENTO;
            let usuario = "";
            if(!await isEntradaAlreadyCreated(idContenedor)){
                
                for(let dato of licencias){

                    const { ARTICULO, FECHACONFIRM, LOCACION, QTY, LICENCIA, ITEMDESC, USUARIO } = dato;
                    usuario = USUARIO;
                        let producto = await Producto.findOne({clave: ARTICULO}).exec();
                        const fecha = createDateForForPartida(FECHACONFIRM);
                       
                        if(producto === null){

                            const product = {
                                "clienteFiscal_id": mongoose.Types.ObjectId(CLIENTE_FISCAL_ID),
                                "almacen_id": mongoose.Types.ObjectId(ALMACEN_ID),
                                "sucursal_id": mongoose.Types.ObjectId(SUCURSAL_ID),
                                "clave": ARTICULO,
                                "arrClientesFiscales_id": [mongoose.Types.ObjectId(CLIENTE_FISCAL_ID)],
                                "descripcion": ITEMDESC,
                                "embalajes": {
                                    "tarimas" : 0,
                                    "piezas" : 0,
                                    "unidades" : 0
                                },
                                "exitenciaPesoBruto":0,
                                "existenciaPesoNeto":0,
                                "usuarioAlta": "CTI",
                                "usuarioAlta_id": 22,
                            }
                            producto = await ProdcutoController.createProductIfNotExists(product);
                        }

                        const partidaMirage = await createPartida({
                                producto,
                                cantidad: QTY,
                                almacen_id: ALMACEN_ID,
                                locacion: LOCACION,
                                articulo: ARTICULO,
                                descripcion: ITEMDESC,
                                licencia: LICENCIA}
                                );
                                //partidasMirage.push(partidaMirage);
                            //partidasMirage.push(partidaMirage);
                                
                                partidaMirage.InfoPedidos[0].IDAlmacen=ALMACEN_ID;
                                let nPartida = new PartidaModel(partidaMirage);
                                
                                await nPartida.save().then(async (partida) => {
                                    partidasMirage.push(partida)
                                    //Posicionar partidas
                                    await positionPartida(partida, ALMACEN_ID);
                                });
                }
   
                await createEntrada({
                    almacen_id: ALMACEN_ID,
                    clienteFiscal_id: CLIENTE_FISCAL_ID,
                    sucursal_id: SUCURSAL_ID,
                    partidas: partidasMirage,
                    idContenedor,
                    usuario
                })

                }

                remisionesCreadas.push(idContenedor);

        }
    //return res.status(200).send({statusCode: 200, response: {message: "OK", token: token, data }});
    
    return res.status(200).send({statusCode: 200, response: {message: "OK", partidasMirage, ENTRADA_MIRAGE_JSON, movimientosCreados: remisionesCreadas}});

}

async function createPartida({
    producto,
    cantidad,
    almacen_id,
    locacion,
    licencia,
    articulo,
    descripcion
}){

    const posicion = await formatPosicion(locacion, almacen_id);

    posicion._id = mongoose.Types.ObjectId();
    posicion.embalajesEntrada = { unidades: cantidad};
    posicion.embalajesxSalir = { unidades: cantidad};
    posicion.isEmpty = false;
    return {
        isEmpty: false,
        producto_id:producto?._id,
        clave:articulo,
        descripcion:descripcion,
        origen:"MIRAGE-HANDHELD", // Origen de la informacion,
        tipo: "NORMAL",
        status: "ASIGNADA",
        lote: licencia,
        embalajesEntrada: { 
            unidades: cantidad}, //Los embalajes seran Unidades,
        embalajesxSalir: { 
            unidades:cantidad
        },
        InfoPedidos:[{ "IDAlmacen": almacen_id}],
        valor:0,
        posiciones: [
            posicion
        ]
    }

}

async function createEntrada(entradaInformation){

    try {

            const { almacen_id, clienteFiscal_id, sucursal_id, partidas, idContenedor, usuario } = entradaInformation
        
            //creacion de la entrada   
            let nEntrada = new Entrada();
            nEntrada.fechaEntrada = new Date();
            nEntrada.almacen_id=mongoose.Types.ObjectId(almacen_id);
            nEntrada.clienteFiscal_id = clienteFiscal_id;
            nEntrada.sucursal_id = sucursal_id;
            nEntrada.status = "APLICADA";//replace arrival
            nEntrada.tipo = "NORMAL";
            nEntrada.partidas = partidas.map(partida => partida._id) //Obtener los ids de las partidas;
            nEntrada.nombreUsuario = "MIRAGE HANDHELD";
            nEntrada.usuario = usuario;
            //nEntrada.tracto = noOrden.trailer;			
            nEntrada.referencia = idContenedor;
            nEntrada.factura = idContenedor;
            nEntrada.item = idContenedor;
            //nEntrada.transportista = noOrden.transportista;
            //nEntrada.operador = noOrden.chofer;
            //nEntrada.sello=noOrden.sello;
            //nEntrada.ordenCompra=noOrden.po;
            nEntrada.fechaAlta = new Date();

            const cantidadEntradas = await EntradaModel.countDocuments({clienteFiscal_id: clienteFiscal_id}).exec() + 1;

            nEntrada.idEntrada = cantidadEntradas;
            nEntrada.folio = cantidadEntradas;
            nEntrada.stringFolio = await Helper.getStringFolio(nEntrada.folio, nEntrada.clienteFiscal_id, 'I', false);
            //nEntrada.fechaSalidaPlanta = new Date(fechaSalidaPlanta);
            await nEntrada.save()
				.then(async (entrada) => {
					//console.log("testpartidas");

					await Partida.asignarEntrada( partidas.map(x => x._id.toString()), entrada._id.toString());
					//console.log(partidas);
                    await crearMovimientos(entrada, 1, "ENTRADA");

                    const partidasDocument = await PartidaModel.find({_id:{$in: partidas}}).exec();
                      //clave	lote	fechaProduccion	fechaCaducidad	Embalaje	CantidadxEmbalaje  
                    let partidaTemplate = "";
                      partidasDocument.forEach((partida, index) => {

                        const {clave, lote, descripcion, embalajesxSalir} = partida;
                        const embalajes = Object.keys(embalajesxSalir)[0];

                        partidaTemplate += `<tr>
												<td>${index + 1}</td>
                                                <td>${clave}</td>
												<td>${lote}</td>
												<td style="width: 600px;">${descripcion}</td>
												<td>${embalajes}</td>
												<td>${embalajesxSalir.unidades}</td>
											</tr>`

                    })
                    //Crear bitacora para controlar las veces que se resuben los pedidos
                    //adicional a eso, crear funcionalidad para enviar un correo para verificar que se subio el pedido	
                    let detallesEntradasPartidasTemplates = generateTableEntradasTempate(partidaTemplate, entrada);

                    mailer.sendEmail({body: detallesEntradasPartidasTemplates}, "[LGKGO] Notificacion Creacion Entradas Mirage")
                    .then(response =>{
                        console.log("Se ha enviado el mensaje con exito");
                    });

					console.log(entrada.factura);
					console.log("/--------end----------/")
				}).catch((error) => {
					console.log(error);
					reserror=error
				});

    } catch (error) {
        
    }

}

function generateTableEntradasTempate(detallesPartidasList, entrada) {
    
    const { factura, stringFolio, fechaAlta  } = entrada;
    
    const template = `
            ${bodyMailTemplate.templateStyle()}
            <h1 class="title">El sistema Logistik-GO ha dado de Alta la siguiente Entrada</h1>
            <h2>Informacion</h2>
            <ul>
                <li>Contenedor: ${factura}</li>
                <li>Folio: ${stringFolio}</li>
                <li>Fecha Alta: ${dateFormat(fechaAlta, "dd/mm/yyyy")}</li>        
            </ul>    
            <table>
            <th>Numero</th>
            <th>Clave</th>
            <th>Licencia</th>
            <th>Descripcion</th>
            <th>Embalaje</th>
            <th>Cantidad</th>
            ${detallesPartidasList}
    </table>`

    const $ = cheerio.load(template);


    return $.html();	

}


async function positionPartida(partida, almacen_id){

    try {
        const posiciones = partida.posiciones[0];
        const pasillo = posiciones.pasillo_id;
        const posicionNumber = parseInt(posiciones.posicion);
        const nivel_id = posiciones.nivel_id;

        const pasilloDocument = await Pasillo.findOne({"_id": pasillo, "almacen_id": almacen_id}).exec();
        const posicionId = pasilloDocument.posiciones[posicionNumber - 1];
        const posicionDocument = await Posicion.findById(posicionId.posicion_id).exec();

        const nivelDocument = posicionDocument.niveles.find(nivel => nivel._id.toString() === nivel_id.toString());
        const cantidadPosition = partida.embalajesEntrada.unidades;

        const productoInformation = {
            "_id": mongoose.Types.ObjectId(),
            "producto_id": partida.producto_id,
            "embalajes": {
                "unidades": cantidadPosition
            }
        }

        nivelDocument.isCandadoDisponibilidad = true;
        nivelDocument.apartado = true;

        nivelDocument.productos.push(productoInformation);

        await posicionDocument.save().then(async (posicion) => {
            console.log("Posicion guradada");
        });

       // await Posicion.updateOne({"_id": posicionDocument._id}, { $set: { niveles: nivelDocument } })


    } catch (error) {
        console.log(error);    
    }
}



async function crearMovimientos(entrada, signo, tipo){
    
    const partidas = entrada.partidas;
    const partidasDocument = await PartidaModel.find({_id:{$in: partidas}}).exec();

    for(let partida of partidasDocument){
        const movimientoInventario = {
            "_id" : mongoose.Types.ObjectId(),
            "posiciones" : partida.posiciones,
            "producto_id" : partida.producto_id,
            "entrada_id" : entrada._id,
            "fechaMovimiento" : new Date(),
            "embalajes" : partida.embalajesEntrada,
            "signo" : signo,
            "tipo" : tipo,
            "clienteFiscal_id" : entrada.clienteFiscal_id,
            "idSucursal" : entrada.idSucursal,
            "sucursal_id" : entrada.sucursal_id,
            "almacen_id" : entrada.almacen_id,
            "referencia" : entrada.factura,
        }
        
        let movimientoInventarioDocument = new MovimientoInventarioModel(movimientoInventario);

        await updateExistencia(partida);


    await movimientoInventarioDocument.save().then(async (movimiento) => {
        console.log("Movimiento guardado");
    });


    }

    async function updateExistencia(partida){
        
        const currentProducto = await ProductoModel.findOne({"_id": partida.producto_id});

        currentProducto.embalajes.unidades += partida.embalajesEntrada.unidades;    
        
        currentProducto.fechaUltimaEntrada = new Date();

        await ProductoModel.updateOne({"_id":currentProducto._id },  {$set: { 
            "embalajes.unidades": currentProducto.embalajes.unidades,
            "fechaUltimaEntrada": currentProducto.fechaUltimaEntrada}})
    }



   
   

   


}

module.exports = {
    entradaMirageHandHeld
}
