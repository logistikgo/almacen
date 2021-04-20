'use strict'

const ColumnasxTipoUsuario = require('./ColumnasxTipoUsuario.model');

async function get(tipoUsuario, idTable) {
    let resColumnas;

    await ColumnasxTipoUsuario.findOne({ tipoUsuario: tipoUsuario, idTabla: idTable })
        .then((columnas) => {
            resColumnas = columnas;
        })
        .catch((error) => {
        });

    return resColumnas;
}

module.exports = {
    get
}