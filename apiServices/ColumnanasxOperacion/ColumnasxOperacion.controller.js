'use strict'

const ColumnasxOperacion = require('./ColumnasxOperacion.model');

function get(req, res) {
    let tabla = req.params.idTable;
    let clienteFiscal_id = req.params.clienteFiscal_id;
    let sucursal_id = req.params.sucursal_id;
    let almacen_id = req.params.almacen_id;

    ColumnasxOperacion.find({
        clienteFiscal_id: clienteFiscal_id,
        sucursal_id: sucursal_id,
        almacen_id: almacen_id,
        idTabla: tabla
    })
        .then((columnas) => {
            console.log(columnas);
            res.status(200).send(columnas);
        })
}

module.exports = {
    get
}