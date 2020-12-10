'use strict'

const Partida = require('../models/Partida');
const ModificacionesModel = require('../models/Modificaciones');

async function get(req, res){

    try {

            
            let pagination = {
                page: parseInt(req.query.page) || 10,
                limit: parseInt(req.query.limit) || 1,
                select: "ubicacion nombreUsuario",
                populate: "partida_id"
            }

            const clienteFiscal_id = req.query.idClienteFiscal;
            const almacen_id = req.query.almacen_id;
        
            const modificaciones = await ModificacionesModel.paginate({"clienteFiscal_id": clienteFiscal_id},pagination)
            /* .populate({
                path: 'partida_id',
                model: 'Partida',
                select: 'clave embalajesxSalir lote descripcion fechaCaducidad posiciones'
            }).exec() */;
            const arrBitacoraMod = [];              
            if(modificaciones){

                modificaciones.docs.forEach(modificacion =>{

                 let partidaInfo = {...modificacion.partida_id._doc};
                 delete modificacion._doc["partida_id"]; 
                 let bitacoraMod = {...partidaInfo, ...modificacion._doc};   

                 arrBitacoraMod.push(bitacoraMod);


                })
                
                modificaciones.docs = arrBitacoraMod
                res.status(200).send(modificaciones);
            }
        
    } catch (error) {
        
        res.status(500).send(error);
    }





}



module.exports = {
    get
    //save
}