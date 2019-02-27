'use strict'

const ColumnasxTipoUsuario = require('../models/ColumnasxTipoUsuario');

function get(tipoUsuario, idTable) {
    let resColumnas;

    ColumnasxTipoUsuario.find({tipoUsuario: tipoUsuario, idTabla: idTable})
    .then((columnas) => {
        resColumnas = columnas;
    })
    .catch((error) => {
        resColumnas = null;
    });
        console.log(resColumnas);
    return resColumnas;
}

module.exports = {
    get
}