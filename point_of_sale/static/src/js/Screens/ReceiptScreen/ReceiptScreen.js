odoo.define('point_of_sale.ReceiptScreen', function (require) {
    'use strict';

    const { Printer } = require('point_of_sale.Printer');
    const { is_email } = require('web.utils');
    const { useRef, useContext } = owl.hooks;
    const { useErrorHandlers, onChangeOrder } = require('point_of_sale.custom_hooks');
    const Registries = require('point_of_sale.Registries');
    const AbstractReceiptScreen = require('point_of_sale.AbstractReceiptScreen');

    const ReceiptScreen = (AbstractReceiptScreen) => {
        class ReceiptScreen extends AbstractReceiptScreen {
            constructor() {
                super(...arguments);
                useErrorHandlers();
                onChangeOrder(null, (newOrder) => newOrder && this.render());
                this.orderReceipt = useRef('order-receipt');
                const order = this.currentOrder;
                const client = order.get_client();
                this.orderUiState = useContext(order.uiState.ReceiptScreen);
                this.orderUiState.inputEmail = this.orderUiState.inputEmail || (client && client.email) || '';
                this.is_email = is_email;
            }
            mounted() {
                // Here, we send a task to the event loop that handles
                // the printing of the receipt when the component is mounted.
                // We are doing this because we want the receipt screen to be
                // displayed regardless of what happen to the handleAutoPrint
                // call.
                setTimeout(async () => {
                    let images = this.orderReceipt.el.getElementsByTagName('img');
                    for(let image of images) {
                        await image.decode();
                    }
                    await this.handleAutoPrint();
                }, 0);
            }
            async onSendEmail() {
                if (!is_email(this.orderUiState.inputEmail)) {
                    this.orderUiState.emailSuccessful = false;
                    this.orderUiState.emailNotice = this.env._t('Invalid email.');
                    return;
                }
                try {
                    await this._sendReceiptToCustomer();
                    this.orderUiState.emailSuccessful = true;
                    this.orderUiState.emailNotice = this.env._t('Email sent.');
                } catch (error) {
                    this.orderUiState.emailSuccessful = false;
                    this.orderUiState.emailNotice = this.env._t('Sending email failed. Please try again.');
                }
            }
            get orderAmountPlusTip() {
                const order = this.currentOrder;
                const orderTotalAmount = order.get_total_with_tax();
                const tip_product_id = this.env.pos.config.tip_product_id && this.env.pos.config.tip_product_id[0];
                const tipLine = order
                    .get_orderlines()
                    .find((line) => tip_product_id && line.product.id === tip_product_id);
                const tipAmount = tipLine ? tipLine.get_all_prices().priceWithTax : 0;
                const orderAmountStr = this.env.pos.format_currency(orderTotalAmount - tipAmount);
                if (!tipAmount) return orderAmountStr;
                const tipAmountStr = this.env.pos.format_currency(tipAmount);
                return `${orderAmountStr} + ${tipAmountStr} tip`;
            }
            get currentOrder() {
                return this.env.pos.get_order();
            }
            get nextScreen() {
                return { name: 'ProductScreen' };
            }
            whenClosing() {
                this.orderDone();
            }
            /**
             * This function is called outside the rendering call stack. This way,
             * we don't block the displaying of ReceiptScreen when it is mounted; additionally,
             * any error that can happen during the printing does not affect the rendering.
             */
            async handleAutoPrint() {
                if (this._shouldAutoPrint()) {
                    await this.printReceipt();
                    if (this.currentOrder._printed && this._shouldCloseImmediately()) {
                        this.whenClosing();
                    }
                }
            }
            orderDone() {
                // alert('Listo 1');
                this.currentOrder.finalize();
                const { name, props } = this.nextScreen;
                this.showScreen(name, props);
            }
            async printReceipt() {
                const isPrinted = await this._printReceipt();
                if (isPrinted) {
                    this.currentOrder._printed = true;
                }
            }

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

            _shouldAutoPrint() {
                // alert('Listo 2');
                // UPDATE 16-02-2022:
                let order = this.currentOrder;
            
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
                return this.env.pos.config.iface_print_auto && !this.currentOrder._printed;
            }
            _shouldCloseImmediately() {
                var invoiced_finalized = this.currentOrder.is_to_invoice() ? this.currentOrder.finalized : true;
                return this.env.pos.proxy.printer && this.env.pos.config.iface_print_skip_screen && invoiced_finalized;
            }
            async _sendReceiptToCustomer() {
                const printer = new Printer(null, this.env.pos);
                const receiptString = this.orderReceipt.comp.el.outerHTML;
                const ticketImage = await printer.htmlToImg(receiptString);
                const order = this.currentOrder;
                const client = order.get_client();
                const orderName = order.get_name();
                const orderClient = { email: this.orderUiState.inputEmail, name: client ? client.name : this.orderUiState.inputEmail };
                const order_server_id = this.env.pos.validated_orders_name_server_id_map[orderName];
                await this.rpc({
                    model: 'pos.order',
                    method: 'action_receipt_to_customer',
                    args: [[order_server_id], orderName, orderClient, ticketImage],
                });
            }
        }
        ReceiptScreen.template = 'ReceiptScreen';
        return ReceiptScreen;
    };

    Registries.Component.addByExtending(ReceiptScreen, AbstractReceiptScreen);

    return ReceiptScreen;
});
