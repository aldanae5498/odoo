odoo.define('point_of_sale.AnularReceiptScreen', function (require) {
    'use strict';

    const AbstractReceiptScreen = require('point_of_sale.AbstractReceiptScreen');
    const Registries = require('point_of_sale.Registries');

    const AnularReceiptScreen = (AbstractReceiptScreen) => {
        class AnularReceiptScreen extends AbstractReceiptScreen {
            mounted() {
                this.printReceipt();
            }
            confirm() {
                this.showScreen('TicketScreen', { reuseSavedUIState: true });
            }

            async printReceipt() {
                console.log('Datos de la orden:');
                let order = this.props.order;
                console.log(order);    
                order.imprimirTxt(order, 2);           
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
        AnularReceiptScreen.template = 'AnularReceiptScreen';
        return AnularReceiptScreen;
    };
    Registries.Component.addByExtending(AnularReceiptScreen, AbstractReceiptScreen);

    return AnularReceiptScreen;
});
