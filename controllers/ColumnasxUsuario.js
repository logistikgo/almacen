'use strict'

const ColumnasxUsuario = require('../models/ColumnasxUsuario');
const ColumnasxTipoUsuario = require("../controllers/ColumnasxTipoUsuario");

async function get(idUsuario, idTable) {
    let resColumnas;

    await ColumnasxUsuario.find({idUsuario: idUsuario, idTabla: idTable})
    .then((columnas) => {
        resColumnas = columnas;
    console.log(resColumnas);

    })
    .catch((error) => {
        resColumnas = null;
    });
    console.log(resColumnas);
    return resColumnas;
}

async function getColumns(req, res) {
    console.log(req.query);

    let idUsuario = req.query.idUsuario;
    let tipousuario = req.query.tipousuario;
    let idTable = req.query.idTable;
    let columnas;

    try{
        columnas = get(idUsuario, idTable);
        console.log(columnas);
        if(columnas == null || columnas == undefined){
            columnas = await ColumnasxTipoUsuario.get(tipousuario, idTable);
            console.log(columnas);
        }

        columnas = columnas == undefined ? {} : columnas;
    }
    catch(e){
        res.status(500).send(e);
    }

    res.status(200).send(columnas);
}

module.exports = {
    getColumns
}