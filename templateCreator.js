function bodyHtml(detallesPedidosTemplates){

        return `<!DOCTYPE html>
        <html lang="en">
        
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        
        ${templateStyle()}
        
        <body>
            <h1 class="title">El sistema Logistik-GO ha resubido unos pedidos</h1>
            ${detallesPedidosTemplates}	
        </body>
        
        </html>
        `
    }

    function templateStyle(){

        return `<style>
        body {
            font-family: sans-serif;
            font-size: 0.8em;
        }

        tr,
        td,
        th {
            border: 1px solid black;
        }

        tr td {
            padding: 6px;
            text-align: center;
        }

        th {
            padding: 5px;
            color: rgb(51 122 183);
        }

        .title {
            font-size: 1.5em;
            letter-spacing: 1px;
        }

        table{
            border-collapse: collapse;
            border: 1px solid black;
            width: 50%;
            margin: 0 auto;
        }
        table tr:nth-child(1n){
            background-color: blue;

        }
        table tr:nth-child(2n){
            background-color: white;

        }
        </style>`
    }

    module.exports = {
        bodyHtml
    }