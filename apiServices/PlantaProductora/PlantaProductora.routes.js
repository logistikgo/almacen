const { Router } = require('express');
const router = new Router();

const PlantaProductora = require('./PlantaProductora.controller');

router.get('/api/getPlantaProductora',PlantaProductora.getPlantaProductora);

module.exports = router;