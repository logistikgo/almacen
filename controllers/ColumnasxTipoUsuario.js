'use strict'

const ColumnasxTipoUsuario = require('../models/ColumnasxTipoUsuario');

function get(req, res) {
    let tipoUsuario = req.query.tipoUsuario;
    let idTable = req.query.idTable;

    ColumnasxTipoUsuario.find({tipoUsuario: tipoUsuario, idTabla: idTable})
        .then((columnas) => {
            res.status(200).send(conf);
        })
        .catch((error) => {
            return res.status(500).send({
                message: error
            });
        });
}

//

module.exports = {
    get
}