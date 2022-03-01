# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

import itertools
from unicodedata import category
from odoo import api, fields, models, tools
from odoo.exceptions import UserError

class StockValoracionReport(models.TransientModel):
    """Reporte de Valoración de Inventario."""
    _name = 'stock.valoracion.wizard'
    _description = 'Reporte de la Valoración del Inventario'

    @tools.ormcache()
    def _get_default_category_id(self):
        return self.env.ref('product.product_category_all')       

    categ_id = fields.Many2one(
        'product.category', 'Categoría',
        change_default=True, default=_get_default_category_id,
        required=False, help="Seleccione la categoría del producto")

    location_id = fields.Many2one(
        'stock.location', 'Almacén',
        change_default=True, required=False, help="Seleccione el almacén", domain="[('usage', '=', 'internal')]")        

    product_id = fields.Many2one(
        'product.template', 'Producto',
        change_default=True,
        required=False, help="Seleccione un producto")

    @api.onchange('categ_id')
    def _onchange_categ_id(self):
        self.categ_id = self.categ_id     

    def generate_report(self):
        data = {
            'categ_id': self.categ_id.id,
            'location_id': self.location_id.id,
            'product_id': self.product_id.id,
        }
        return self.env.ref('stock.stock_valoracion_wizard_report').report_action([], data=data)
