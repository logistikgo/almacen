const ReenvioBitacoraPedidosModel = require("../models/RenvioPedidosBitacora");


async function get(req, res){

    const clienteFiscal_id = req.query?.idClienteFiscal;
    const almacen_id = req.query?.idAlmacen;
    const sucursal_id = req.query?.idSucursal;

    const ReenvioBitacoraPedidos = await ReenvioBitacoraPedidosModel.find({
        "clienteFiscal_id": clienteFiscal_id, 
        "almacen_id": almacen_id, 
        "sucursal_id": sucursal_id})
        .populate({
            path: 'almacen_id',
            model: 'Almacen',
            select: "nombre"})
        .populate({
            path: 'salida_id',
            model: 'Salida',
            select: "status fechaAlta salida_id folio referencia destinatario tipo stringFolio"}).exec();

    res.status(200).send(ReenvioBitacoraPedidos);


}

module.exports = {
   get 
}