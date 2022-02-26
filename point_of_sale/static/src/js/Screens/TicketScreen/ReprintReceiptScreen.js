odoo.define('point_of_sale.ReprintReceiptScreen', function (require) {
    'use strict';

    const AbstractReceiptScreen = require('point_of_sale.AbstractReceiptScreen');
    const Registries = require('point_of_sale.Registries');

    const ReprintReceiptScreen = (AbstractReceiptScreen) => {
        class ReprintReceiptScreen extends AbstractReceiptScreen {
            mounted() {
                this.printReceipt();
            }
            confirm() {
                this.showScreen('TicketScreen', { reuseSavedUIState: true });
            }

            // ============================ Inicio de funciones que imprimen el txt ============================ //
            // Inicio del UPDATE 24-02-2022.
            // ===================================================================================== //
            getParteEntera(numero) {
                numero = Number(numero);
                numero = Math.trunc(numero);
                return numero;
            }            

            getParteDecimal(numero) {
                let numberAfterDecimal = (numero % 1);
                numberAfterDecimal = numberAfterDecimal.toFixed(2).toString();
                numberAfterDecimal = numberAfterDecimal.substring(numberAfterDecimal.indexOf('.') + 1);
                // UPDATE:
                return numberAfterDecimal;     
        
                /*
                let numberAfterDecimal = parseInt((numero % 1).toFixed(2).substring(2));
                // UPDATE:
                let numberBeforeDecimal = parseInt(numero);
                return numberAfterDecimal;        
                */
            }            

            getTramaCantidad(cantidad) {
                let parteEntera = this.getParteEntera(cantidad);
                let parteDecimal = this.getParteDecimal(cantidad);
                let cerosDecimal = '';
        
                let lenDigitosDecimal = parteDecimal.length;
                switch (lenDigitosDecimal) {
                    case 0:
                        cerosDecimal = '000';
                        break;
                    case 1:
                        cerosDecimal = '00';
                        break;
                    case 2:
                        cerosDecimal = '0';
                        break;                                
                }
                
                parteEntera = parteEntera.toString();
                parteDecimal = parteDecimal.toString();
        
                // let cantidadFormateada = '<b style="color: green;">'+parteEntera + parteDecimal + cerosDecimal+'</b>';
                let cantidadFormateada = parteEntera + parteDecimal + cerosDecimal;
        
                let cantidadString = parteEntera.toString() + parteDecimal.toString(); 
                let lenCantidadString = cantidadString.length;
                
                let diferenciaLenCantidad = 16 - lenCantidadString;
                let cerosIzquierda = '';
                for(let i = 0; i < diferenciaLenCantidad; i++) {
                        cerosIzquierda += '0';
                }
                let trama = cerosIzquierda + cantidadFormateada;
                
                return [cantidadFormateada, trama];
            }            

            getTramaPrecio(precio) {
                let parteEntera = this.getParteEntera(precio);
                let parteDecimal = this.getParteDecimal(precio);
                let cerosDecimal = '';
        
                let lenDigitosDecimal = parteDecimal.length;
                switch (lenDigitosDecimal) {
                    case 0:
                        cerosDecimal = '00';
                        break;
                    case 1:
                        cerosDecimal = '0';
                        break;                             
                }
                
                parteDecimal = parteDecimal.toString(); 
                // let precioFormateado = '<b style="color: #f44336;">'+parteEntera + parteDecimal + cerosDecimal+'</b>';
                let precioFormateado = parteEntera + parteDecimal + cerosDecimal;        
        
                let precioString = parteEntera.toString() + parteDecimal.toString(); 
                //  console.log('Len string del precio: ' + precioString);
                let lenPrecioString = precioString.length;
                
                let diferenciaLenPrecio = 16 - lenPrecioString;
                let cerosIzquierda = '';
                for(let i = 0; i < diferenciaLenPrecio; i++) {
                        cerosIzquierda += '0';
                }
                let trama = cerosIzquierda + precioFormateado;
                
                return [precioFormateado, trama];
            }            
            // ===================================================================================== //
            // Fin del UPDATE 24-02-2022.     

            // Función que imprime txt:
            imprimirTxt(order) {
                // ===================================================================================== //
                // Inicio del UPDATE: 25-02-2022.
                // Descargando factura:
                // this.currentOrder.set_to_invoice(this.currentOrder.is_to_invoice());
                // Renderizando:
                // this.render();            
                
                // UPDATE 16-02-2022:
                // let order = this.currentOrder;
            
                console.log('Datos de la Factura:');
                console.log(order);
                
                // Datos de la orden:
                let order_uid = order.uid; 
                let totalPagarUser = order.selected_paymentline.amount; 
                // console.log('Orden UID:');
                // console.log(order_uid);

                // Datos del cliente:
                let cliente = order.get_client();

                // console.log('cliente.vat: ' + typeof(cliente.vat));
                // console.log('cliente.phone: ' + typeof(cliente.phone));
                // console.log('cliente.address: ' + typeof(cliente.address));
                if( typeof cliente.vat === 'boolean' ) {
                    cliente.vat = '';
                }
                if( typeof cliente.address === 'boolean' ) {
                    cliente.address = '';
                }
                if( typeof cliente.phone === 'boolean' ) {
                    cliente.phone = '';
                }                                

                let orderUidIF = order_uid;
                let orderUidUser = 'N° Factura: ' + order_uid;

                let vatIF = 'iR*' + cliente.vat;
                let vatUser = 'Cédula/RIF: ' + cliente.vat;

                let nombreClienteIF = 'iS*' + cliente.name;
                let nombreClienteUser = 'Cliente: ' + cliente.name;

                let direccionClienteIF = 'i00Direccion: ' + cliente.address;
                let direccionClienteUser = 'Dirección: ' + cliente.address;

                let telefonoClienteIF = 'i01Telefono: ' + cliente.phone;
                let telefonoClienteUser = 'Teléfono: ' + cliente.phone;

                let datosIF = orderUidIF + '\n' + vatIF  + '\n' + nombreClienteIF + '\n' + direccionClienteIF + '\n' + telefonoClienteIF + '\n\n';
                let datosUser = orderUidUser + '\n' + vatUser  + '\n' + nombreClienteUser + '\n' + direccionClienteUser + '\n' + telefonoClienteUser + '\n\n';

                // let datos = order.get_paymentlines();
                let detalleProductoIF = '';

                let detalleProductoUser = '';

                let detalle_productos = order.get_orderlines();
                for(let i=0; i<detalle_productos.length; i++) {
                    let datosRow = detalle_productos[i];
                    
                    let price = datosRow['price'];
                    price = price.toFixed(2); // #  <--------- Importante.

                    let quantity = datosRow['quantity'];
                    
                    let sub_total = price * quantity;
                    // sub_total = parseFloat(sub_total);
                    sub_total = sub_total.toFixed(2);

                    let product = datosRow['product'];

                    console.log('Barcode: ' + product['barcode']);
                    console.log('Barcode typeof: ' + typeof product['barcode']);

                    let barcodeIF = '@' + '0000000000' + '\n';
                    let barcodeUser = '';
                    if( typeof product['barcode'] !== 'boolean' ) {
                        if( product['barcode'] !== '' ) {
                            barcodeIF = '@' + product['barcode'] + '\n';
                            barcodeUser = 'Código de Barras: ' + product['barcode'] + '\n';
                        } else {
                            barcodeUser = 'Código de Barras: Sin especificar' + '\n';
                        }
                    }

                    let display_name = product['display_name'];
                    console.log('Display name: ' + display_name);                    

                    let taxes_id = product['taxes_id'];
                    // console.log('taxes_id:');
                    // console.log(taxes_id);

                    let taxFormatIF = ' ';
                    let taxFormatUser = 'Exento';
                    if( taxes_id.length > 0 ) {
                        let tax = taxes_id[0];
                        switch(tax) {
                            case 1: // Exento (ventas)
                                taxFormatIF = ' ';
                                taxFormatUser = 'Exento';
                                break;                                  
                            case 2: // IVA (16.0%) ventas
                                taxFormatIF = '!';
                                taxFormatUser = 'IVA (16.0%)';
                                break;
                            case 3: // IVA (8.0%) ventas
                                taxFormatIF = '#';
                                taxFormatUser = 'IVA (8.0%)';
                                break;                                                  
                        }
                    }

                    // ================ Precio ================ //
                    let parteEnteraPrecio = this.getParteEntera(price);
                    let parteDecimalPrecio = this.getParteDecimal(price);
                    let tramaPrecio = this.getTramaPrecio(price)[1];   
                    console.log('Precio: ' + price);
                    console.log('Parte entera (Precio): ' + parteEnteraPrecio);
                    console.log('Parte decimal (Precio): ' + parteDecimalPrecio)
                    // console.log('Trama (Precio): ' + tramaPrecio);
                    
                    // ================ Cantidad ================ //
                    let parteEnteraCantidad = this.getParteEntera(quantity);
                    let parteDecimalCantidad = this.getParteDecimal(quantity);
                    let tramaCantidad = this.getTramaCantidad(quantity)[1];    
                    console.log('Cantidad: ' + quantity);
                    console.log('Parte entera (Cantidad): ' + parteEnteraCantidad);
                    console.log('Parte decimal (Cantidad): ' + parteDecimalCantidad);                    
                    // console.log('Trama (Cantidad): ' + tramaCantidad);

                    // UPDATE 24-02-2022:
                    let tramaPrecioCantidad = tramaPrecio + tramaCantidad;
                    // console.log('Trama completa: ' + tramaPrecioCantidad);

                    detalleProductoIF += barcodeIF + taxFormatIF + tramaPrecioCantidad + display_name + '\n';
                    detalleProductoUser += barcodeUser + '\n' + quantity + 'x' + display_name + '-------> ' + sub_total + ' ('+taxFormatUser+')' + '\n';
                    console.log('---------------------------------------------');
                }
                console.log('Detalles de la factura:');
                console.log(detalle_productos);                  

                // Impresora Fiscal:
                datosIF += detalleProductoIF;
                datosIF += '3\n';
                datosIF += '101\n';

                // Usuario:
                datosUser += detalleProductoUser;   
                datosUser += '\nTotal: ' + totalPagarUser;

                // console.log('Datos del cliente:');
                // console.log(cliente); 

                // Generando archivo txt (Impresora Fiscal):
                // let filename = 'reimpresion_factura_tpv';
                let filename = 'factura_tpv';
                let element = document.createElement('a');
                element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(datosIF));
                element.setAttribute('download', filename);
                
                element.style.display = 'none';
                document.body.appendChild(element);

                element.click();
                document.body.removeChild(element);
                // ===================================================================================== //
                // Generando archivo txt (Usuario):
                /*
                let filenameUser = order_uid;
                let elementUser = document.createElement('a');
                elementUser.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(datosUser));
                elementUser.setAttribute('download', filenameUser);
                
                elementUser.style.display = 'none';
                document.body.appendChild(elementUser);

                elementUser.click();
                document.body.removeChild(elementUser);                
                */
            
                // ===================================================================================== //
                // ===================================================================================== //
                // Fin del UPDATE: 25-02-2022.                
            }
            // ============================ Fin de funciones que imprimen el txt ============================ //

            async printReceipt() {
                console.log('Datos de la orden:');
                let order = this.props.order;
                console.log(order);    
                this.imprimirTxt(order);           
                if(this.env.pos.proxy.printer && this.env.pos.config.iface_print_skip_screen) {
                    let result = await this._printReceipt();
                    if(result)
                        this.showScreen('TicketScreen', { reuseSavedUIState: true });                   
                }
            }
            async tryReprint() {
                await this._printReceipt();
            }
        }
        ReprintReceiptScreen.template = 'ReprintReceiptScreen';
        return ReprintReceiptScreen;
    };
    Registries.Component.addByExtending(ReprintReceiptScreen, AbstractReceiptScreen);

    return ReprintReceiptScreen;
});
