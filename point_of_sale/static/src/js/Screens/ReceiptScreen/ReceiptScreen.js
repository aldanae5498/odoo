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

            // UPDATE 17-02-2022:
            setTramaPrecioCantidad(precio, cantidad) {
                // let precio = '34.21';
                // let cantidad = '564.90';
                precio = precio.toFixed(2);
                precio = precio.toString();
                cantidad = cantidad.toString();
                
                // ===================== Trama del precio ===================== //
                let precio_parte_entera = precio.split(".")[0]; 
                let precio_parte_decimal = precio.substring(precio.indexOf('.') + 1);
                if( precio_parte_decimal.length === 1 ) {
                    precio_parte_decimal = precio_parte_decimal + '0';
                }
        
                // console.log('Parte entera: ' + precio_parte_entera);
                // console.log('Parte decimal: ' + precio_parte_decimal);
        
                let precio_string = precio_parte_entera + precio_parte_decimal;
                // console.log('Precio string: ' + precio_string);
        
                let longitud_precio_string = precio_string.length;
                // console.log('Longitud del precio string: ' + longitud_precio_string);
        
                let diferencia_longitud_precio = 16 - longitud_precio_string;
                let ceros_precio = '';
                for(let i = 0; i < diferencia_longitud_precio; i++) {
                    ceros_precio += '0';
                }
        
                let trama_precio = ceros_precio + precio_string;
                // console.log('Trama del precio: ' + trama_precio);
        
                // ===================== Trama de la cantidad ===================== //
                let cantidad_parte_entera;
                let cantidad_parte_decimal = '000';
        
                if( cantidad.indexOf('.') > -1 ) { // <---- Tiene decimales.
                    cantidad_parte_entera = cantidad.split(".")[0];
                    
                    cantidad_parte_decimal = cantidad.substring(cantidad.indexOf('.') + 1);
                    if( cantidad_parte_decimal.length === 0 ) {
                        cantidad_parte_decimal = cantidad_parte_decimal + '000';
                    } else if( cantidad_parte_decimal.length === 1 ) {
                        cantidad_parte_decimal = cantidad_parte_decimal + '00';
                    } else if( cantidad_parte_decimal.length === 2 ) {
                        cantidad_parte_decimal = cantidad_parte_decimal + '0';
                    }
                } else {
                    cantidad_parte_entera = cantidad;
                }
                
                let cantidad_string = cantidad_parte_entera + cantidad_parte_decimal;
                // console.log('Cantidad string: ' + cantidad_string);
        
                let longitud_cantidad_string = cantidad_string.length;
                // console.log('Longitud del cantidad string: ' + longitud_cantidad_string);        
                let diferencia_longitud_cantidad = 17 - longitud_cantidad_string;
                let ceros_cantidad = '';
                for(let i = 0; i < diferencia_longitud_cantidad; i++) {
                    ceros_cantidad += '0';
                }
        
                let trama_cantidad = ceros_cantidad + cantidad_string;
                // console.log('Trama de la cantidad: ' + trama_cantidad);      
        
                // ===================== Trama completa ===================== //
                let trama_completa = trama_precio + trama_cantidad;
                // console.log('Trama completa: ' + trama_completa);
                
                return trama_completa;
            }

            _shouldAutoPrint() {
                // alert('Listo 2');
                // UPDATE 16-02-2022:
                let order = this.currentOrder;
            
                // Datos de la orden:
                let order_uid = order.uid; 
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
    
                let vat = 'iR*' + cliente.vat;
                let nombre_cliente = 'iS*' + cliente.name;
                let direccion_cliente = 'i00Direccion: ' + cliente.address;
                let telefono_cliente = 'i01Telefono: ' + cliente.phone;

                // let datos_txt = '\n';
                // datos_txt += vat  + '\n' + nombre_cliente + '\n' + direccion_cliente + '\n' + telefono_cliente + '\n\n';
                let datos_txt = order_uid + '\n' + vat  + '\n' + nombre_cliente + '\n' + direccion_cliente + '\n' + telefono_cliente + '\n\n';
    
                // let datos = order.get_paymentlines();
                let datos_productos = '';
                let detalle_productos = order.get_orderlines();
                for(let i=0; i<detalle_productos.length; i++) {
                    let datosRow = detalle_productos[i];
                    
                    let price = datosRow['price'];
                    let quantity = datosRow['quantity'];

                    // console.log('Price: ' + price);
                    /// let sub_total = price * quantity;
    
                    let product = datosRow['product'];

                    console.log('Barcode: ' + product['barcode']);
                    console.log('Barcode typeof: ' + typeof product['barcode']);
                    let barcode = '';
                    if( typeof product['barcode'] !== 'boolean' ) {
                        if( product['barcode'] !== '' ) {
                            barcode = '@' + product['barcode'] + '\n';
                        }
                    }

                    let display_name = product['display_name'];
                    console.log('Display name: ' + display_name);                    

                    let taxes_id = product['taxes_id'];
                    // console.log('taxes_id:');
                    // console.log(taxes_id);

                    let tax_format = ' ';
                    if( taxes_id.length > 0 ) {
                        let tax = taxes_id[0];
                        switch(tax) {
                            case 1: // Exento (ventas)
                                tax_format = ' ';
                                break;                                  
                            case 2: // IVA (16.0%) ventas
                                tax_format = '!';
                                break;
                            case 3: // IVA (8.0%) ventas
                                tax_format = '"';
                                break;                                                  
                        }
                    }

                    // UPDATE 18-02-2022:
                    let tramaCantidadPrecio = this.setTramaPrecioCantidad(price, quantity);

                    // datos_productos += barcode + '\n' + quantity + 'x' + display_name + '-------> ' + sub_total + '\n';
                    // datos_productos += barcode + '\n' + quantity + 'x' + display_name + '-------> ' + sub_total + '\n';
                    datos_productos += barcode + tax_format + tramaCantidadPrecio + display_name + '\n';
                    console.log('---------------------------------------------');
                }
                console.log('Datos de la factura:');
                console.log(detalle_productos);                  
    
                // let datos_txt = datos_cliente + '\n\n\n --------------- ' + detalle_productos;
                datos_txt += datos_productos;
                datos_txt += '3\n';
                datos_txt += '101\n';
    
                // console.log('Datos del cliente:');
                // console.log(cliente); 
    
                // Generando archivo txt:
                // let filename = order_uid;
                let filename = 'factura_tpv';
                let element = document.createElement('a');
                element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(datos_txt));
                element.setAttribute('download', filename);
              
                element.style.display = 'none';
                document.body.appendChild(element);
    
                element.click();
                document.body.removeChild(element);
                // ===================================================================================== //
                // Enviando txt a impresora fiscal:
                /*
                $.ajax({
                    type:'POST',
                    url:'C:\Python27\BIXOLON812\TFHKA Venezuela - Python SDK\Demo Venezuela Python 4.0\impresora_fiscal_test.py',
                    data: {
                        'param': 1
                    },
                    success: function(data) {                                                     
                        console.log('Todo bien');
                    }
                });                   
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
