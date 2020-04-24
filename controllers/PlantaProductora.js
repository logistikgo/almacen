'use strict'

const PlantaProductora = require('../models/PlantaProductora');

async function getPlantaProductora(req, res) {
    
    console.log(req.query);
    PlantaProductora.find({ IdCliente: req.query.idClienteFiscal })
        .then((planta) => {
            console.log(planta);
            res.status(200).send(planta);
        })
        .catch((error) => {
            res.status(500).send(error);
        });
}

module.exports = {
	getPlantaProductora
}
