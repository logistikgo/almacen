'use strict'

const Sucursal = require('../models/Sucursal');

function get(req, res) {
    let idCteFiscal = parseInt(req.query.idCteFiscal);

    Sucursal.find({
            arrClienteFiscales: idCteFiscal
        })
        .then((sucursales) => {
            res.status(200).send(sucursales);
        })
        .catch((error) => {
            return res.status(500).send({
                message: "Error al realizar la peticion"
            });
        });

    //Test
}

module.exports = {
    get
}
