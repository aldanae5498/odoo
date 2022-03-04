# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models, _
from odoo.exceptions import UserError


class PosDetailsDetalle(models.TransientModel):
    """Reporte de Ventas registradas en el módulo Administrativo y Punto de Venta."""
    _name = 'sale.ordenes.globales.detalle.wizard'
    _description = 'Reporte de Órdenes Globales - Detalle'

    def _default_start_date(self):
        """ Find the earliest start_date of the latests sessions """
        # restrict to configs available to the user
        # config_ids = self.env['pos.config'].search([]).ids
        # exclude configs has not been opened for 2 days
        '''
        self.env.cr.execute("""
            SELECT
            max(start_at) as start,
            config_id
            FROM pos_session
            WHERE config_id = ANY(%s)
            AND start_at > (NOW() - INTERVAL '2 DAYS')
            GROUP BY config_id
        """, (config_ids,))        
        '''
        self.env.cr.execute("""
            SELECT
            max(start_at) as start,
            config_id
            FROM pos_session
            WHERE start_at > (NOW() - INTERVAL '2 DAYS')
            GROUP BY config_id
        """)

        latest_start_dates = [res['start']
                              for res in self.env.cr.dictfetchall()]
        # earliest of the latest sessions
        return latest_start_dates and min(latest_start_dates) or fields.Datetime.now()

    start_date = fields.Datetime('Fecha de inicio', required=True, default=_default_start_date)
    end_date = fields.Datetime('Fecha final', required=True, default=fields.Datetime.now)
    partner_id = fields.Many2one(
        'res.partner', 'Cliente',
        change_default=True, required=False, help="Seleccione un cliente")   
    # pos_config_ids = fields.Many2many('pos.config', 'pos_detail_configs',
    # default=lambda s: s.env['pos.config'].search([]))

    @api.onchange('start_date')
    def _onchange_start_date(self):
        if self.start_date and self.end_date and self.end_date < self.start_date:
            self.end_date = self.start_date

    @api.onchange('end_date')
    def _onchange_end_date(self):
        if self.end_date and self.end_date < self.start_date:
            self.start_date = self.end_date

    def generate_report_detalle(self):
        data = {
            'date_start': self.start_date,
            'date_stop': self.end_date,
            'partner_id': self.partner_id.id,
            # 'config_ids': self.pos_config_ids.ids
        }
        return self.env.ref('sale.sale_ordenes_globales_detalle_report').report_action([], data=data)
