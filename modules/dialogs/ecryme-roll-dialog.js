import { EcrymeUtility } from "../common/ecryme-utility.js";

export class EcrymeRollDialog extends Dialog {

  /* -------------------------------------------- */
  static async create(actor, rollData) {

    let options = { classes: ["ecryme-roll-dialog"], width: 540, height: 'fit-content', 'z-index': 99999 }
    let html = await renderTemplate('systems/fvtt-ecryme/templates/dialogs/roll-dialog-generic.hbs', rollData);
    return new EcrymeRollDialog(actor, rollData, html, options);
  }

  /* -------------------------------------------- */
  constructor(actor, rollData, html, options, close = undefined) {
    let isCard = rollData.attr && rollData.attr.iscard
    let conf = {
      title: game.i18n.localize("ECRY.ui.rolltitle"),
      content: html,
      buttons: {
        roll: {
          icon: '<i class="fas fa-check"></i>',
          label: game.i18n.localize("ECRY.ui.roll"),
          callback: () => { this.roll() }
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
  roll() {
    EcrymeUtility.rollEcryme(this.rollData)
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

    html.find('#bonusMalusPerso').change((event) => {
      this.rollData.bonusMalusPerso = Number(event.currentTarget.value)
    })
    html.find('#roll-difficulty').change((event) => {
      this.rollData.difficulty = Number(event.currentTarget.value) || 0
    })
    html.find('#roll-specialization').change((event) => {
      this.rollData.selectedSpecs = $('#roll-specialization').val()
    })
    html.find('#roll-trait-bonus').change((event) => {
      this.rollData.traitsBonus = $('#roll-trait-bonus').val()
    })
    html.find('#roll-trait-malus').change((event) => {
      this.rollData.traitsMalus = $('#roll-trait-malus').val()
    })
    html.find('#roll-select-transcendence').change((event) => {
      this.rollData.skillTranscendence = Number($('#roll-select-transcendence').val())
    })    
    html.find('#roll-use-spleen').change((event) => {
      this.rollData.useSpleen = event.currentTarget.checked
    })      
    html.find('#roll-use-ideal').change((event) => {
      this.rollData.useIdeal = event.currentTarget.checked
    })      

  }
}