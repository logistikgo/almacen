'use strict'

const PlantaProductora = require('../PlantaProductora/PlantaProductora.model');

async function getPlantaProductora(req, res) {
    
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
