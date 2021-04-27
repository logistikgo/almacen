'use strict'
const mongoose = require('mongoose');
const Pasillo = require('../../Pasillos/Pasillo.model');
const Posicion = require('../../Posicion/Posicion.model');
const Helper = require('../../../services/utils/helpers')

async function formatPosicion(locacion, almacen_id){
    

    try {
        const pos = "X0101"
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

        return {
                "isEmpty" : false,
                "pasillo" : pasilloDocument.nombre,
                "pasillo_id" : pasilloDocument._id,
                "posicion" : posicionDocument.nombre,
                "posicion_id" : posicionDocument._id,
                "nivel_id" : nivelDocument._id,
                "nivel" : nivelDocument.nombre
            }
    
    } catch (error) {
        console.log("No existe el pasillo")
    }

    


}

function createDateFormatForRequest(){

    const dateIsoString = new Date().toISOString().split("T")[0].split("-");
    const [ year, month, day ] = dateIsoString;
    const dateFormato = `${year}${month}${day}`;

    return dateFormato;
}

function createDateForForPartida(date){
    let dateToFormat = date;
    let isNotADigit = /\D/g 
    let formatoCorrecto = dateToFormat.replace(isNotADigit, "")
    let fechaFormatoCorrecto = new Date(parseInt(formatoCorrecto));

    return fechaFormatoCorrecto
}


module.exports = {
    formatPosicion,
    createDateFormatForRequest,
    createDateForForPartida
}