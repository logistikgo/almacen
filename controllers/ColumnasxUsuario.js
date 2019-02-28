'use strict'

const ColumnasxUsuario = require('../models/ColumnasxUsuario');
const ColumnasxTipoUsuario = require("../controllers/ColumnasxTipoUsuario");

async function get(idUsuario, idTable) {
    let resColumnas = null;;
    console.log( resColumnas);

    await ColumnasxUsuario.findOne({idUsuario: idUsuario, idTabla: idTable})
    .then((columnas) => {
        resColumnas = columnas;
        console.log( "get usuario then" + resColumnas);
        console.log(resColumnas);
        console.log(columnas.toArray().lenght);
    })
    .catch((error) => {
    });
    console.log("get usuario" + resColumnas);
    console.log( resColumnas);

    return resColumnas;
}

async function getColumns(req, res) {
    let idUsuario = req.query.idUsuario;
    let tipousuario = req.query.tipousuario;
    let idTable = req.query.idTable;
    let columnas;

    try{
        columnas = await get(idUsuario, idTable);
        console.log("getColumns 1" + columnas);
        console.log(columnas);

        console.log(columnas == null);

        if(columnas == null){
            columnas = await ColumnasxTipoUsuario.get(tipousuario, idTable);
            console.log("getColumns 2" + columnas);
        }
        console.log(columnas);
        columnas = columnas == undefined || columnas == null ? {} : columnas;
    res.status(200).send(columnas);

    }
    catch(e){
        res.status(500).send(e);
    }

}

module.exports = {
    getColumns
}