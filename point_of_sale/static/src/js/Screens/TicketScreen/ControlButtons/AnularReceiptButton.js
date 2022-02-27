odoo.define('point_of_sale.AnularReceiptButton', function (require) {
    'use strict';

    const { useListener } = require('web.custom_hooks');
    const PosComponent = require('point_of_sale.PosComponent');
    const Registries = require('point_of_sale.Registries');

    class AnularReceiptButton extends PosComponent {
        constructor() {
            super(...arguments);
            useListener('click', this._onClick);
            console.log('Anular');
        }
        async _onClick() {
            console.log('Anular 2');
            if (!this.props.order) return;
            this.showScreen('AnularReceiptScreen', { order: this.props.order });
        }
    }
    AnularReceiptButton.template = 'AnularReceiptButton';
    Registries.Component.add(AnularReceiptButton);

    return AnularReceiptButton;
});
