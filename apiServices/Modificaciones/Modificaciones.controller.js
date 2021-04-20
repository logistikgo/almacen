'use strict'

const ModificacionesModel = require('./Modificaciones.model');
const Helper = require("../../helpers");
async function get(req, res){

    try {

           /*  let pagination = {
                page: parseInt(req.query.page) || 10,
                limit: parseInt(req.query.limit) || 1,
                select: "ubicacion ubicacionModificada fechaCaducidadAnterior fechaCaducidadModificada embalajesAnteriores embalajesModificados fechaAlta nombreUsuario ubicacionAnterior loteAnterior loteModificado",
                populate: "partida_id",
                sort: { "fechaAlta": -1 },
            }
            pagination.limit = 2600; */
            const clienteFiscal_id = req.query.idClienteFiscal;
            const almacen_id = req.query.almacen_id;
        /* 
            const modificaciones = await ModificacionesModel.paginate({"clienteFiscal_id": clienteFiscal_id},pagination)
            .populate({
                path: 'partida_id',
                model: 'Partida',
                select: 'clave embalajesxSalir lote descripcion fechaCaducidad posiciones'
            }).exec();
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
            } */
        
            const modificaciones = await ModificacionesModel.find({"clienteFiscal_id": clienteFiscal_id})
            .populate({
                path: 'partida_id',
                model: 'Partida',
                select: 'clave embalajesxSalir lote descripcion fechaCaducidad posiciones isEmpty'
            }).sort({"fechaAlta": -1});

            let arrBitacoraMod = [];

            if(modificaciones){

                await Helper.asyncForEach(modificaciones, function(bitacoraMod, index){

    
                        bitacoraMod.clave = bitacoraMod?.partida_id.clave;
                        bitacoraMod.descripcion = bitacoraMod?.partida_id.descripcion;
                        bitacoraMod.embalajesxSalir = bitacoraMod?.partida_id.embalajesxSalir;
    
                        arrBitacoraMod.push(bitacoraMod);

                })


                return res.status(200).send(arrBitacoraMod);

            }


    } catch (error) {
        
        res.status(500).send(error);
    }





}



module.exports = {
    get
    //save
}