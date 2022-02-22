odoo.define('point_of_sale.OrderWidget', function(require) {
    'use strict';

    const { useState, useRef, onPatched } = owl.hooks;
    const { useListener } = require('web.custom_hooks');
    const { onChangeOrder } = require('point_of_sale.custom_hooks');
    const PosComponent = require('point_of_sale.PosComponent');
    const Registries = require('point_of_sale.Registries');
        
    class OrderWidget extends PosComponent {
        constructor() {
            super(...arguments);
            useListener('select-line', this._selectLine);
            useListener('edit-pack-lot-lines', this._editPackLotLines);
            onChangeOrder(this._onPrevOrder, this._onNewOrder);
            this.scrollableRef = useRef('scrollable');
            this.scrollToBottom = false;
            onPatched(() => {
                // IMPROVEMENT
                // This one just stays at the bottom of the orderlines list.
                // Perhaps it is better to scroll to the added or modified orderline.
                if (this.scrollToBottom) {
                    this.scrollableRef.el.scrollTop = this.scrollableRef.el.scrollHeight;
                    this.scrollToBottom = false;
                } 
            });
            
            this.state = useState({ 
                total: 0, 
                tax: 0, 
                valor_usd: 0,
                valor_bolivar: 0,
                tasa_vigente: 0,
                conversion_dolares: 0,
            });

            this._showCurrencyRates();
        }
        
        _getCurrencyRates(){
            let self = this;
            let rpc = require('web.rpc');
            return rpc.query({
                    model: 'pos.session',
                    method: 'get_currency_rates'
                }).then(function (data) {
                    return self.valores_tasas = [parseFloat( data[0] ), parseFloat( data[1] )];
                });
        }

        get order() {
            return this.env.pos.get_order();
        }
        get orderlinesArray() {
            return this.order ? this.order.get_orderlines() : [];
        }
        _selectLine(event) {
            this.order.select_orderline(event.detail.orderline);
        }
        // IMPROVEMENT: Might be better to lift this to ProductScreen
        // because there is similar operation when clicking a product.
        //
        // Furthermore, what if a number different from 1 (or -1) is specified
        // to an orderline that has product tracked by lot. Lot tracking (based
        // on the current implementation) requires that 1 item per orderline is
        // allowed.
        async _editPackLotLines(event) {
            const orderline = event.detail.orderline;
            const isAllowOnlyOneLot = orderline.product.isAllowOnlyOneLot();
            const packLotLinesToEdit = orderline.getPackLotLinesToEdit(isAllowOnlyOneLot);
            const { confirmed, payload } = await this.showPopup('EditListPopup', {
                title: this.env._t('Lot/Serial Number(s) Required'),
                isSingleItem: isAllowOnlyOneLot,
                array: packLotLinesToEdit,
            });
            if (confirmed) {
                // Segregate the old and new packlot lines
                const modifiedPackLotLines = Object.fromEntries(
                    payload.newArray.filter(item => item.id).map(item => [item.id, item.text])
                );
                const newPackLotLines = payload.newArray
                    .filter(item => !item.id)
                    .map(item => ({ lot_name: item.text }));

                orderline.setPackLotLines({ modifiedPackLotLines, newPackLotLines });
            }
            this.order.select_orderline(event.detail.orderline);
        }
        _onNewOrder(order) {
            if (order) {
                order.orderlines.on(
                    'new-orderline-selected',
                    () => this.trigger('new-orderline-selected'),
                    this
                );
                order.orderlines.on('change', this._showCurrencyRates, this);
                order.orderlines.on(
                    'add remove',
                    () => {
                        this.scrollToBottom = true;
                        this._showCurrencyRates();
                    },
                    this
                );
                order.on('change', this.render, this);
            }
            this._showCurrencyRates();
            this.trigger('new-orderline-selected');
        }
        _onPrevOrder(order) {
            if (order) {
                order.orderlines.off('new-orderline-selected', null, this);
                order.orderlines.off('change', null, this);
                order.orderlines.off('add remove', null, this);
                order.off('change', null, this);
            }
        }

        _updateSummary(value) {
            const total = this.order ? this.order.get_total_with_tax() : 0;
            const tax = this.order ? total - this.order.get_total_without_tax() : 0;
            const valor_usd = this.valores_tasas[0].toFixed(2);
            const valor_bolivar = this.valores_tasas[1].toFixed(2);
            const calculo_tasa = valor_bolivar / valor_usd;
            const tasa_vigente = calculo_tasa.toFixed(2);
            const calculo_conversion = total / tasa_vigente;
            const conversion_dolares = calculo_conversion.toFixed(2);
            
            this.state.total = this.env.pos.format_currency(total);
            this.state.tax = this.env.pos.format_currency(tax);
            this.state.valor_usd = valor_usd;
            this.state.tasa_vigente = tasa_vigente;
            this.state.conversion_dolares = conversion_dolares;
            
            console.log('Valor del dólar: ' + valor_usd);
            console.log('Valor del bolívar: ' + valor_bolivar);
            console.log('Tasa Vigente: ' + tasa_vigente);
            console.log('Conversión: ' + conversion_dolares);

            this.render();
        }
        
        _showCurrencyRates() {
            const currencyRates = this._getCurrencyRates();
            const printCurrencyRates = () => {
                currencyRates.then((value) => {
                  // console.log(a);
                  this._updateSummary(value);
                });
            };
            printCurrencyRates();
        }
    }
    OrderWidget.template = 'OrderWidget';

    Registries.Component.add(OrderWidget);

    return OrderWidget;
});
