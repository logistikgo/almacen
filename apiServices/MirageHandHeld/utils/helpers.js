'use strict'
const mongoose = require('mongoose');
const Pasillo = require('../../Pasillos/Pasillo.model');
const Posicion = require('../../Posicion/Posicion.model');
const Helper = require('../../../services/utils/helpers');
const EntradaModel = require('../../Entradas/Entrada.model');
const SalidaModel = require('../../Salidas/Salida.model');

async function formatPosicion(locacion, almacen_id, embalajes = null){
    

    try {
        const pos = "X0102"
        const pasillo = pos.substr(0, 1);
        const posicion = pos.substr(1, 2)
        const posicionNumber = parseInt(posicion);
        const nivel = pos.substr(3, 2)
        console.log(`${pasillo}-${posicion}-${nivel}`);

        const pasilloDocument = await Pasillo.findOne({"nombre": pasillo, "almacen_id": almacen_id}).exec();
        const posicionId = pasilloDocument.posiciones[posicionNumber - 1];
        const nivelLetter = Helper.getLevelNameFromNumber(nivel);
        const posicionDocument = await Posicion.findById(posicionId.posicion_id).exec();

        const nivelDocument = posicionDocument.niveles.find(nivel => nivel.nombre === nivelLetter);

        if(embalajes !== null){
            return {
                "isEmpty" : false,
                "pasillo" : pasilloDocument.nombre,
                "pasillo_id" : pasilloDocument._id,
                "posicion" : posicionDocument.nombre,
                "posicion_id" : posicionDocument._id,
                "nivel_id" : nivelDocument._id,
                "nivel" : nivelDocument.nombre,
                "embalajes": embalajes
            }
        }else{
    
            return {
                    "isEmpty" : false,
                    "pasillo" : pasilloDocument.nombre,
                    "pasillo_id" : pasilloDocument._id,
                    "posicion" : posicionDocument.nombre,
                    "posicion_id" : posicionDocument._id,
                    "nivel_id" : nivelDocument._id,
                    "nivel" : nivelDocument.nombre
                }

        }
    
    } catch (error) {
        console.log("No existe el pasillo")
    }

    


}

function createDateFormatForRequest(){

    try {
        const dateIsoString = new Date().toISOString().split("T")[0].split("-");
        const [ year, month, day ] = dateIsoString;
        const dateFormato = `${year}${month}${day}`; 

        return dateFormato;

    } catch (error) {
        console.error(error);
    }


   
}

function createDateForForPartida(date){

    try {
        let dateToFormat = date;
        let isNotADigit = /\D/g 
        let formatoCorrecto = dateToFormat.replace(isNotADigit, "")
        let fechaFormatoCorrecto = new Date(parseInt(formatoCorrecto));

        
        return fechaFormatoCorrecto
        
    } catch (error) {
        console.error(error);
    }

}


function groupResponseForCriteria(responseToSeparate, groupCriteria, groupDetailCriteria){

    try {
        const criteriasSeparate = new Set(responseToSeparate.map(response => response[groupCriteria]));
        const criteriasGroup = [];

        criteriasSeparate.forEach(criteriaSeparate => {
              
                const responseGroupByCriteria = {}
                responseGroupByCriteria[groupCriteria] = criteriaSeparate;
                responseGroupByCriteria[groupDetailCriteria] = responseToSeparate.filter(response => response[groupCriteria] === criteriaSeparate)
                criteriasGroup.push(responseGroupByCriteria)
            })   
    
            return criteriasGroup;
        
    } catch (error) {
        console.error(error);
    }

}


function separarResponsePorLicencia(entradasMirage){

    try {

        const entradaMirage =  entradasMirage.length !== 0 ? entradasMirage : []; 
        const licenciasPorDocumento = groupResponseForCriteria(entradaMirage, "DOCUMENTO", "LICENCIAS"); 
       
        return licenciasPorDocumento;
        
    } catch (error) {
        console.error(error);
    }

}


async function isEntradaAlreadyCreated(remision){
    
    try {
        const entradaActual = await EntradaModel.find({"referencia": remision}).exec();
        
        return entradaActual.length !== 0 ? true : false;
        
    } catch (error) {
        console.error(error);
    }

}

async function isSalidaAlreadyCreated(referencia){
    
    try {
        const salidaActual = await SalidaModel.find({"referencia": referencia}).exec();
        
        return salidaActual.length !== 0 ? true : false;
        
    } catch (error) {
        console.error(error);
    }

}

function createPosition(posicionAUnir){

    try {
        const pasillo = posicionAUnir.pasillo;
        const posicion = posicionAUnir.posicion;
        const nivel = "0" + Helper.getLevelNumberFromName(posicionAUnir.nivel);
        const posicionCompleta = `${pasillo}-${posicion}-${nivel}`;
    
        return posicionCompleta;
    } catch (error) {
        
    }

   

}


module.exports = {
    formatPosicion,
    createDateFormatForRequest,
    createDateForForPartida,
    separarResponsePorLicencia,
    isEntradaAlreadyCreated,
    isSalidaAlreadyCreated,
    createPosition
}