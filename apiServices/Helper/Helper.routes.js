const { Router } = require('express');
const router = new Router();

const Helper = require('../../services/utils/helpers');

router.get('/api/getDeliveryGroups', Helper.GetDeliveryGroups);

module.exports = router;