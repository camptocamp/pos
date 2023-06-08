from odoo import models


class PosSession(models.Model):
    _inherit = "pos.session"

    def set_cashbox_pos(self, cashbox_value, notes):
        if self.env.user.has_group(
            "pos_user_restriction.group_assigned_points_of_sale_user"
        ):
            res = super(
                PosSession, self.with_context(bypass_pos_user=True)
            ).set_cashbox_pos(cashbox_value, notes)
        else:
            res = super().set_cashbox_pos(cashbox_value, notes)
        return res

    def get_closing_control_data(self):
        if self.env.user.has_group(
            "pos_user_restriction.group_assigned_points_of_sale_user"
        ):
            res = super(
                PosSession, self.with_context(bypass_pos_user=True)
            ).get_closing_control_data()
        else:
            res = super().get_closing_control_data()
        return res
