import { EcrymeUtility } from "../common/ecryme-utility.js";
import { EcrymeRollDialog } from "./ecryme-roll-dialog.js";

export class EcrymeConfrontDialog extends Dialog {

  /* -------------------------------------------- */
  static async create(actor, rollData) {

    let options = mergeObject(super.defaultOptions, {
      classes: ["fvtt-ecryme ecryme-confrontation-dialog"],
      dragDrop: [{ dragSelector: ".confront-dice-container", dropSelector: null }],
      width: 540, height: 'fit-content', 'z-index': 99999
    });

    let html = await renderTemplate('systems/fvtt-ecryme/templates/dialogs/confront-dialog.hbs', rollData);
    return new EcrymeConfrontDialog(actor, rollData, html, options);
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
  async roll() {
  }

  /* ------------------ -------------------------- */
  _onDragStart(event) {
    super._onDragStart(event)
    const diceData = {
      diceIndex : $(event.srcElement).data("dice-idx"),
      diceValue : $(event.srcElement).data("dice-value"),
    }    
    event.dataTransfer.setData("text/plain", JSON.stringify( diceData ));
    console.log(">>>>> DRAG START!!!!", event)
  }

  /* ------------------ -------------------------- */
  async refreshDialog() {
    const content = await renderTemplate("systems/fvtt-ecryme/templates/dialogs/confront-dialog.hbs", this.rollData)
    this.data.content = content
    this.render(true)
  }

  /* -------------------------------------------- */
  _onDrop(event) {
    let dataJSON = event.dataTransfer.getData('text/plain')
    let data = JSON.parse(dataJSON)
    let idx = Number(data.diceIndex)
    console.log("DATA", data, event, event.srcElement.className)
    if ( event.srcElement.className.includes("execution")) {
      this.rollData.availableDices[idx].location = "execution"  
    }
    if ( event.srcElement.className.includes("preservation")) {
      this.rollData.availableDices[idx].location = "preservation"  
    }
    if ( event.srcElement.className.includes("dice-list")) {
      this.rollData.availableDices[idx].location = "mainpool"  
    }
    this.refreshDialog()
  }

  /* -------------------------------------------- */
  activateListeners(html) {
    super.activateListeners(html);

  }
}