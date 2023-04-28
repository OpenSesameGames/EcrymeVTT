import { EcrymeUtility } from "../common/ecryme-utility.js";

export class EcrymeRollDialog extends Dialog {

  /* -------------------------------------------- */
  static async create(actor, rollData) {

    let options = { classes: ["EcrymeDialog"], width: 540, height: 'fit-content', 'z-index': 99999 }
    let html
    if (rollData.attr && rollData.attr.iscard)  {
      html = await renderTemplate('systems/fvtt-ecryme/templates/dialogs/confrontation-dialog.hbs', rollData);
    } else {
      html = await renderTemplate('systems/fvtt-ecryme/templates/dialogs/roll-dialog-generic.hbs', rollData);
    }

    return new EcrymeRollDialog(actor, rollData, html, options);
  }

  /* -------------------------------------------- */
  constructor(actor, rollData, html, options, close = undefined) {
    let isCard = rollData.attr && rollData.attr.iscard
    let conf = {
      title: (isCard) ? "Jet" : "Tirage",
      content: html,
      buttons: {
        roll: {
          icon: '<i class="fas fa-check"></i>',
          label: (isCard) ? "Tirer une carte" : "Lancer le dé",
          callback: () => { this.roll() }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Annuler",
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
  roll() {
    let isCard = this.rollData.attr && this.rollData.attr.iscard
    if (isCard) {
      EcrymeUtility.tirageConfrontationEcryme(this.rollData)
    } else {
      EcrymeUtility.rollEcryme(this.rollData)
    }
  }

  /* -------------------------------------------- */
  async refreshDialog() {
    const content = await renderTemplate("systems/fvtt-ecryme/templates/dialogs/roll-dialog-generic.hbs", this.rollData)
    this.data.content = content
    this.render(true)
  }

  /* -------------------------------------------- */
  activateListeners(html) {
    super.activateListeners(html);

    var dialog = this;
    function onLoad() {
    }
    $(function () { onLoad(); });

    html.find('#bonusMalusSituation').change((event) => {
      this.rollData.bonusMalusSituation = Number(event.currentTarget.value)
    })
    html.find('#bonusMalusPerso').change((event) => {
      this.rollData.bonusMalusPerso = Number(event.currentTarget.value)
    })
    html.find('#bonusMalusDef').change((event) => {
      this.rollData.bonusMalusDef = Number(event.currentTarget.value)
    })
    html.find('#bonusMalusPortee').change((event) => {
      this.rollData.bonusMalusPortee = Number(event.currentTarget.value)
    })
    html.find('#confrontationDegre').change((event) => {
      this.rollData.confrontationDegre = Number(event.currentTarget.value)
    })
    html.find('#confrontationModif').change((event) => {
      this.rollData.confrontationModif = Number(event.currentTarget.value)
    })
    
  }
}