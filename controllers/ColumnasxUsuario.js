'use strict'

const ColumnasxUsuario = require('../models/ColumnasxUsuario');

function get(req, res) {
    let idUsuario = req.query.idUsuario;
    let idTable = req.query.idTable;

    ColumnasxUsuario.find({idUsuario: idUsuario, idTabla: idTable})
        .then((columnas) => {
            res.status(200).send(columnas);
        })
        .catch((error) => {
            return res.status(500).send({
                message: error
            });
        });
}

module.exports = {
    get
}