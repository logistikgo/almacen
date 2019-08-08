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

    }
    catch(error){
        res.status(500).send(error);
    }
    
    Partida.find(json_filter)
    .then((partidas)=>{
        res.status(200).send(partidas);
    })
    .catch((error)=>{
        res.status(500).send(error);
    });
}

async function put(arrPartidas,salida_id){

    var arrPartidas_id = [];
    let entrada_id = arrPartidas.length > 0 ? arrPartidas[0].entrada_id : undefined;
    
    await Helper.asyncForEach(arrPartidas,async function(partida){

        arrPartidas_id.push(partida._id);
        let jsonSalida_id = {
            salida_id : salida_id,
            embalajes : partida.embalajesEnSalida,
            pesoNeto : partida.pesoNetoEnSalida,
            pesoBruto : partida.pesoBrutoEnSalida
        };

        let partidaFound = await Partida.findOne({_id : partida._id});

        if(partidaFound){    
            partidaFound.salidas_id.push(jsonSalida_id);

            let changes = {
                salidas_id : partidaFound.salidas_id,
                embalajesxSalir : partida.embalajesxSalir,
                pesoNetoxSalir : partida.pesoNetoxSalir,
                pesoBrutoxSalir : partida.pesoBrutoxSalir,
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
	let isPesosEmpty = false;
	let isEmbalajesEmpty = false;

	for(let embalaje in partida.embalajesxSalir){tamEmbalajes+=1;} //Se obtiene la cantidad de embalajes
	for(let embalaje in partida.embalajesxSalir){  //Obtiene la cantidad de embalajes con cero
		if(partida.embalajesxSalir[embalaje]==0) contEmbalajesCero+=1; 
	}

	if(partida.pesoBrutoxSalir == 0 && partida.pesoNetoxSalir == 0) 
		isPesosEmpty = true;
	else
		isPesosEmpty = false;
	// Si la cantidad de embalajes es igual a la cantidad de embalajes con cero
	if(tamEmbalajes == contEmbalajesCero) 
		isEmbalajesEmpty = true; 
	else
		isEmbalajesEmpty = false;

	if(isEmbalajesEmpty && isPesosEmpty)
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
            await Entrada.updateOne({_id : entrada_id},{$set: {isEmpty : true }}).exec();
        }
    }
}


module.exports = {
    get,
    post,
    addSalida,
    getByEntrada,
    getBySalida,
    put
}