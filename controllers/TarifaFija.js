'use strict'

 const TarifaFija = require('../models/TarifaFija');

 function get (req, res) {

    let cliente_id = req.params.cliente_id;

    TarifaFija.find({cliente_id: cliente_id})
    .then(data => {
        res.status(200).send(data);
    })
    .catch(error => {
        res.status(500).send(error);
    });
 }

 function post (req, res) {
     let newTarifaFija = new TarifaFija(req,body);
     newTarifaFija.save()
     .then(saved => {
         res.status(200).send(saved);
     })
     .catch(error => {
         res.status(500).send(error);
     });
 }

 function edit (req,res) {
    let update_id = req.params._id;

    TarifaFija.updateOne({_id: update_id}, {$set: req.params})
    .then(edited => {
        res.status(200).send(edited);
    })
    .catch(error => {
        res.status(500).send(error);
    });
 }

 function remove (req, res) {
     let delete_id = req.params._id;
     TarifaFija.updateOne({_id : delete_id}, {$set: {status : "BAJA"}})
     .then(edited => {
         res.status(200).send(edited)
     })
     .catch(error => {
         res.status(500).send(error);
     });
 }

 module.exports = {
     get,
     post,
     edit,
     remove
 }