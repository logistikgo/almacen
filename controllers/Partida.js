'use strict'

const Partida = require('../models/Partida');
const Salida = require('../models/Salida');
const Helper = require('../helpers');

function get(req,res){
    let encoded_filter = req.params.filtro;
    var buff;
    var data_filter;
    var json_filter;

    try
    {
        buff = new Buffer(encoded_filter,'base64');
        data_filter = buff.toString('ascii');

        json_filter = JSON.parse(data_filter);

        Partida.find(json_filter)
        .populate('entrada_id','fechaEntrada fechaAlta','Entrada')
        .then((partidas)=>{
            res.status(200).send(partidas);
        })
        .catch((error)=>{
            res.status(500).send(error);
        });
    }
    catch(error){
        res.status(500).send(error);
    }
    
    
}

async function put(arrPartidas,salida_id){

    /**
     * Guarda para cada partida, las cantidades restantes y updatea la Entrada isEmpty a true
     * si todas las partidas estan vacias
     */

    var arrPartidas_id = [];
    let entradas_id = arrPartidas.length > 0 ? arrPartidas.map(x=> x.entrada_id) : undefined;
    
    await Helper.asyncForEach(arrPartidas,async function(partida){

        arrPartidas_id.push(partida._id);
        let jsonSalida_id = {
            salida_id : salida_id,
            embalajes : partida.embalajesEnSalida,
            salidaxPosiciones : partida.embalajesEnSalidaxPosicion
        };

        let partidaFound = await Partida.findOne({_id : partida._id});

        if(partidaFound){    
            partidaFound.salidas_id.push(jsonSalida_id);

            let changes = {
                salidas_id : partidaFound.salidas_id,
                embalajesxSalir : partida.embalajesxSalir,
                posiciones: partida.posiciones,
                isEmpty : partida.isEmpty
            };

            await Partida.updateOne({_id: partidaFound._id},{$set : changes}).exec();
        }

    });

    Helper.asyncForEach(entradas_id,async function(entrada_id){
        await setIsEmptyEntrada(entrada_id);
    });

    return arrPartidas_id;
}

async function post(arrPartidas,entrada_id){

    var arrPartidas_id = [];
    
    await Helper.asyncForEach(arrPartidas,async function(partida){
        let nPartida = new Partida(partida);  
        nPartida.entrada_id = entrada_id;  
        await nPartida.save().then((partida)=>{
            arrPartidas_id.push(partida._id);
        });
    });
    return arrPartidas_id;

}

async function addSalida(salida,_id){
    
    await Partida.findOne({_id:_id}).then((partida)=>{

        partida.salidas_id.push(salida);
        partida.save();
        
    })
    .catch((error)=>{
        res.status(500).send(error);
    });
}

async function getByEntrada(req,res){
    let entrada_id = req.params.entrada_id;

    Partida.find({entrada_id:entrada_id})
    .then((partidas)=>{
        res.status(200).send(partidas);
    })
    .catch((error)=>{
        res.status(500).send(error);
    });
}

async function getBySalida(req,res){
    let salida_id = req.params.salida_id;
    let salida = await Salida.findOne({_id: salida_id}).exec();
    let partidas_id = salida.partidas;

    let partidas = [];

    await Helper.asyncForEach(partidas_id,async function(partida_id){
        let partidaFound = await Partida.findOne({_id: partida_id}).exec();
        let partida = JSON.parse(JSON.stringify(partidaFound));
        let salida_idFound = partida.salidas_id.find(x=> x.salida_id.toString() == salida_id.toString());
        partida.pesoBrutoEnSalida = salida_idFound.pesoBruto;
        partida.pesoNetoEnSalida = salida_idFound.pesoNeto;
        partida.embalajesEnSalida = salida_idFound.embalajes;
        partidas.push(partida);
    });

    res.status(200).send(partidas);
}

function isEmptyPartida(partida){
	let contEmbalajesCero = 0;
	let tamEmbalajes = 0;

	for(let embalaje in partida.embalajesxSalir){tamEmbalajes+=1;} //Se obtiene la cantidad de embalajes
	for(let embalaje in partida.embalajesxSalir){  //Obtiene la cantidad de embalajes con cero
		if(partida.embalajesxSalir[embalaje]==0) contEmbalajesCero+=1; 
	}

	// Si la cantidad de embalajes es igual a la cantidad de embalajes con cero
	if(tamEmbalajes == contEmbalajesCero) 
		return true;
	else
		return false;
}

async function isEmptyPartidas(entrada_id){
    let partidas = await Partida.find({entrada_id : entrada_id}).exec();
	let tamPartidas = partidas.length;
	let conPartidasCero = 0;

	partidas.forEach(function(partida){
		if(isEmptyPartida(partida)) conPartidasCero+=1; //Obtiene la cantidad de partidas en cero
	});

	if (tamPartidas == conPartidasCero) //Si el total de partidas es igual al total de partidas con cero
		return true;
	else
		return false;
}

async function setIsEmptyEntrada(entrada_id){
    if(entrada_id){
        let bisEmptyPartidas = await isEmptyPartidas(entrada_id);

        if(bisEmptyPartidas){
            await Entrada.updateOne({_id : entrada_id},{$set: {isEmpty : true,status: "FINALIZADO" }}).exec();
        }
    }
}

async function getByProductoEmbalaje(req,res){

    /**
     * Obtiene las partidas por SKU, y genera los embalajes que se sacaran dependiendo
     * de la disponibilidad de los embalajes existentes
     */
    
    let producto_id = req.params.producto_id; //Hexa
    let embalaje = req.params.embalaje; //tarimas, piezas
    let embalajesxSalir = "embalajesxSalir." + embalaje; //"embalajesxSalir.tarimas"
    let clienteFiscal_id = req.params.clienteFiscal_id; //He
    let sucursal_id = req.params.sucursal_id;
    let almacen_id = req.params.almacen_id;
    let cantidad = req.params.cantidad;  
    let cantidadRestante = parseFloat(cantidad);
    let isPEPS = req.params.isPEPS;

    let BreakException = {};

    /**
     * Se obtienen las partidas necesarias para la cantidad deseada
     * Se obtienen las partidas que no estan vacias, que tienen existencias por salir
     * del embalaje solicitado y se ordenan de forma ascendente, de la mas antigua a la mas reciente
     * Filtros utilizados: producto_id, isEmpty, clienteFiscal_id, sucursal_id, almacen_id
     *
     */
    let partidas = await Partida
    .find({producto_id : producto_id, isEmpty : false})
    .populate('entrada_id','fechaEntrada clienteFiscal_id sucursal_id almacen_id',
    {
        clienteFiscal_id : clienteFiscal_id, 
        sucursal_id: sucursal_id, 
        almacen_id: almacen_id
    })
    .where(embalajesxSalir).gt(0)
    .exec();
    partidas = partidas.filter(x=> x.entrada_id != undefined && x.entrada_id.clienteFiscal_id == clienteFiscal_id 
        && x.entrada_id.sucursal_id == sucursal_id && x.entrada_id.almacen_id == almacen_id );

    //Se encuentra la partida de tipo  existencia inicial
    //let partidaExistenciaInicial = await Partida.findOne({producto_id : producto_id, tipo: "EXISTENCIA_INICIAL"}).exec();
    
    
    // if(partidaExistenciaInicial!= undefined && partidaExistenciaInicial.isEmpty == false){
    //     partidas.push(partidaExistenciaInicial);
    // }
    
    partidas = partidas.sort(sortByfechaEntadaAsc);
    
    let partidasActuales = [];

    try
    {
        //Validacion para Clientes fiscales que no utilicen algoritmo PEPS
        console.log("isPEPS",isPEPS,isPEPS == false.toString());
        if(isPEPS == false.toString())
        {
            partidas.forEach(partida=> {
                let subConsecutivo = 0;
                console.log(partida.lote);
                partida.posiciones.filter(x=> !x.isEmpty).forEach(posicion=>{
                    let auxPartida = {
                        lote : partida.lote,
                        clave : partida.clave,
                        descripcion : partida.descripcion,
                        isEmpty : partida.isEmpty,
                        _id : partida._id,
                        _idLocal : partida._id + '/' + subConsecutivo,
                        embalajesEntradaFull : Helper.Clone(partida.embalajesEntrada),
                        embalajesxSalirFull : Helper.Clone(partida.embalajesxSalir),
                        embalajesEntrada : Helper.Clone(posicion.embalajesxSalir),
                        embalajesxSalir : Helper.Clone(posicion.embalajesxSalir),
                        embalajesEnSalida : Helper.emptyEmbalajes(posicion.embalajesxSalir),
                        posicion_id : posicion.posicion_id,
                        posicion : posicion.posicion,
                        pasillo_id : posicion.pasillo_id,
                        pasillo : posicion.pasillo,
                        nivel_id : posicion.nivel_id,
                        nivel : posicion.nivel,
                        producto_id: producto_id,
                        ubicacion_id : posicion._id,
                        posicionesFull : Helper.Clone(partida.posiciones),
                        posiciones : [partida.posiciones.find(x=> x._id.toString() === posicion._id.toString())],
                        subConsecutivo : subConsecutivo,
                        fechaEntrada : partida.entrada_id != undefined ? partida.entrada_id.fechaEntrada : "",
                        entrada_id : partida.entrada_id != undefined ? partida.entrada_id._id : ""
                    };

                    subConsecutivo+=1;
                    partidasActuales.push(auxPartida);
                });
            });

            throw BreakException;
        }

        /**
         * Se obtienen las partidas por posicion, y se determina la cantidad de salida
         * del embalaje para cada posicion, dependiendo de su disponibilidad
         */
    
        console.log(cantidadRestante);
        partidas.forEach(partida=> {
            let subConsecutivo = 0;
            
            partida.posiciones.filter(x=> !x.isEmpty).forEach(posicion=>{
                
              if(cantidadRestante > 0){
                 let auxPartida = {
                     lote : partida.lote,
                     clave : partida.clave,
                     descripcion : partida.descripcion,
                     isEmpty : partida.isEmpty,
                    _id : partida._id,
                    _idLocal : partida._id + '/' + subConsecutivo,
                    embalajesEntradaFull : Helper.Clone(partida.embalajesEntrada),
                    embalajesxSalirFull : Helper.Clone(partida.embalajesxSalir),
                    embalajesEntrada : Helper.Clone(posicion.embalajesxSalir),
                    embalajesxSalir : Helper.Clone(posicion.embalajesxSalir),
                    embalajesEnSalida : Helper.emptyEmbalajes(posicion.embalajesxSalir),
                    posicion_id : posicion.posicion_id,
                    posicion : posicion.posicion,
                    pasillo_id : posicion.pasillo_id,
                    pasillo : posicion.pasillo,
                    nivel_id : posicion.nivel_id,
                    nivel : posicion.nivel,
                    producto_id: producto_id,
                    ubicacion_id : posicion._id,
                    posicionesFull : Helper.Clone(partida.posiciones),
                    posiciones : [partida.posiciones.find(x=> x._id.toString() === posicion._id.toString())],
                    subConsecutivo : subConsecutivo,
                    fechaEntrada : partida.entrada_id != undefined ? partida.entrada_id.fechaEntrada : "",
                    entrada_id : partida.entrada_id != undefined ? partida.entrada_id._id : ""
                 };
                 
                 if(cantidadRestante >= auxPartida.embalajesxSalir[embalaje]){
                    auxPartida.embalajesEnSalida[embalaje] = auxPartida.embalajesxSalir[embalaje];
                    auxPartida.embalajesxSalir[embalaje] = 0;
                    auxPartida.posiciones[0].embalajesxSalir[embalaje] = 0;
                    auxPartida.posiciones[0].isEmpty = true;
                    
                 }else{
                    
                    auxPartida.embalajesEnSalida[embalaje] = cantidadRestante;
                    auxPartida.embalajesxSalir[embalaje] -= cantidadRestante;
                    auxPartida.posiciones[0].embalajesxSalir[embalaje]-=cantidadRestante;
                 }
                 
                 subConsecutivo+=1;
                 partidasActuales.push(auxPartida);
                 cantidadRestante-=auxPartida.embalajesEnSalida[embalaje];
              }else{
                  //Si no hay mas que sacar entonces simplemente termina
                 throw BreakException;
              }
          });
        });
        //Si los ciclos han terminado entonces se lanza  la excepcion de finalización.
        //Puesto que ya no hay partidas disponibles
        throw BreakException;
    }
    catch(e){
        if(e == BreakException){
            res.status(200).send(partidasActuales);
        }else
        {
            throw e;
        }
    }
}

function sortByfechaEntadaDesc(a,b){
    if(a.entrada_id.fechaEntrada < b.entrada_id.fechaEntrada){
        return 1;
    }
    if(a.entrada_id.fechaEntrada > b.entrada_id.fechaEntrada){
        return -1;
    }

    return 0;
}

function sortByfechaEntadaAsc(a,b){
    if(a.fechaEntrada == undefined || a.fechaEntrada == null || b.fechaEntrada == undefined || b.fechaEntrada == null){
        return -1;
    }
    if(a.entrada_id.fechaEntrada < b.entrada_id.fechaEntrada){
        return -1;
    }
    if(a.entrada_id.fechaEntrada > b.entrada_id.fechaEntrada){
        return 1;
    }

    return 0;
}

module.exports = {
    get,
    post,
    addSalida,
    getByEntrada,
    getBySalida,
    put,
    getByProductoEmbalaje
}