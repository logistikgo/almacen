'use strict'

const ColumnasxUsuario = require('../models/ColumnasxUsuario');
const ColumnasxTipoUsuario = require("../controllers/ColumnasxTipoUsuario");

async function get(idUsuario, idTable) {
    let resColumnas;

    await ColumnasxUsuario.findOne({idUsuario: idUsuario, idTabla: idTable})
    .then((columnas) => {
        resColumnas = columnas;
    })
    .catch((error) => {
    });

    return resColumnas;
}

async function getColumns(req, res) {
    let idUsuario = req.query.idUsuario;
    let tipousuario = req.query.tipoUsuario;
    let idTable = req.query.idTable;
    let columnas;

    try{
        columnas = await get(idUsuario, idTable);

        if(columnas == null){
            columnas = await ColumnasxTipoUsuario.get(tipousuario, idTable);
        }
        columnas = columnas == null ? [] : columnas.columnas;
        
        res.status(200).send(columnas);
    }
    catch(e){
        res.status(500).send(e);
    }
}

module.exports = {
    getColumns
}