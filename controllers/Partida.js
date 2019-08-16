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
    let entrada_id = arrPartidas.length > 0 ? arrPartidas[0].entrada_id : undefined;
    
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

    await setIsEmptyEntrada(entrada_id);

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
	let isEmbalajesEmpty = false;

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
    
    let producto_id = req.params.producto_id;
    let embalaje = req.params.embalaje;
    let clienteFiscal_id = req.params.clienteFiscal_id;
    let sucursal_id = req.params.sucursal_id;
    let almacen_id = req.params.almacen_id;
    //let cantidad = req.params.cantidad;  


    let partidas = await Partida.aggregate([
        {
            $lookup: {
                from: 'Entrada',
                localField : 'entrada_id',
                foreignField : '_id',
                as : 'entrada',
                unwinding : {
                    "preserveNullAndEmptyArrays" : false
                },
                matching : {
                    clienteFiscal_id : clienteFiscal_id,
                    sucursal_id : sucursal_id,
                    almacen_id : almacen_id
                }
            }
        }
    ],function(err,result){
        console.log(result);
        res.status(200).send(result);
    });

    // let partidas = await Partida.find({producto_id: producto_id,isEmpty: false})
    // .populate('entrada_id','clienteFiscal_id sucursal_id almacen_id','Entrada')
    // .where(embalaje).gt(0)
    // .where('entrada_id.clienteFiscal_id',clienteFiscal_id)
    // .where('entrada_id.sucursal_id',sucursal_id)
    // .where('entrada_id.almacen_id',almacen_id)
    // .exec();

    

    // partidas.forEach(function(partida){
    //     partida.posiciones.forEach(function(posicion){

    //     });
    // });

    

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