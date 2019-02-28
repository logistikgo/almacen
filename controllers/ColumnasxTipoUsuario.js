'use strict'

const ColumnasxTipoUsuario = require('../models/ColumnasxTipoUsuario');

async function get(tipoUsuario, idTable) {
    let resColumnas;

    await ColumnasxTipoUsuario.find({tipoUsuario: tipoUsuario, idTabla: idTable})
    .then((columnas) => {
        resColumnas = columnas;
    console.log( "get tipousuario then" + resColumnas);

    })
    .catch((error) => {
        resColumnas = null;
    });
        console.log( "get tipousuario" + resColumnas);
    return resColumnas;
}

module.exports = {
    get
}