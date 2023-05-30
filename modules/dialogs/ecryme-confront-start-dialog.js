import { EcrymeUtility } from "../common/ecryme-utility.js";
import {EcrymeConfrontDialog } from "./ecryme-confront-dialog.js";

export class EcrymeConfrontStartDialog extends Dialog {

  /* -------------------------------------------- */
  static async create(actor, rollData) {

    let options = { classes: ["fvtt-ecryme ecryme-confront-dialog"], width: 540, height: 'fit-content', 'z-index': 99999 }
    let html = await renderTemplate('systems/fvtt-ecryme/templates/dialogs/confront-start-dialog.hbs', rollData);
    return new EcrymeConfrontStartDialog(actor, rollData, html, options);
  }

  /* -------------------------------------------- */
  constructor(actor, rollData, html, options, close = undefined) {
    let conf = {
      title: game.i18n.localize("ECRY.ui.confront"),
      content: html,
      buttons: {
        rollNormal: {
          icon: '<i class="fas fa-check"></i>',
          label: game.i18n.localize("ECRY.ui.rollnormal"),
          callback: () => { this.rollConfront("4d6") }
        },
        rollSpleen: {
          icon: '<i class="fas fa-check"></i>',
          label: game.i18n.localize("ECRY.ui.rollspleen"),
          callback: () => { this.rollConfront("5d6kl4") }
        },
        rollIdeal: {
          icon: '<i class="fas fa-check"></i>',
          label: game.i18n.localize("ECRY.ui.rollideal"),
          callback: () => { this.rollConfront("5d6kh4") }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize("ECRY.ui.cancel"),
          callback: () => { this.close() }
        }
      },
      close: close
    }

    super(conf, options);

    this.actor = actor;
    this.rollData = rollData;
  }

  /* -------------------------------------------- */
  async rollConfront( diceFormula ) {
    // Do the initial roll
    let myRoll = new Roll(diceFormula).roll({async: false})
    await EcrymeUtility.showDiceSoNice(myRoll, game.settings.get("core", "rollMode"))
    // Fill the available dice table
    let rollData = this.rollData
    rollData.roll = duplicate(myRoll)
    rollData.availableDices = []
    for (let result of myRoll.terms[0].results) {
      if ( !result.discarded) {
        let resultDup = duplicate(result)
        resultDup.location = "mainpool"
        rollData.availableDices.push(resultDup)
      }
    }
    let confrontDialog = await EcrymeConfrontDialog.create(this.actor, rollData)
    confrontDialog.render(true)
  }

  /* -------------------------------------------- */
  activateListeners(html) {
    super.activateListeners(html);
  }
}