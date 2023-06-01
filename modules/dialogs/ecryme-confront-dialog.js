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
        launchConfront: {
          icon: '<i class="fas fa-check"></i>',
          label: game.i18n.localize("ECRY.ui.launchconfront"),
          callback: () => { this.launchConfront().catch("Error when launching Confrontation") }
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

    // Ensure button is disabled
    setTimeout(function () { $(".launchConfront").attr("disabled", true) }, 180)
  }

  /* -------------------------------------------- */
  async launchConfront() {
    let msg = await EcrymeUtility.createChatMessage(this.rollData.alias, "blindroll", {
      content: await renderTemplate(`systems/fvtt-ecryme/templates/chat/chat-confrontation-pending.hbs`, this.rollData)
    })
    msg.setFlag("world", "ecryme-rolldata", this.rollData)
  }

  /* -------------------------------------------- */
  async refreshDialog() {
    const content = await renderTemplate("systems/fvtt-ecryme/templates/dialogs/confront-dialog.hbs", this.rollData)
    this.data.content = content
    this.render(true)

    let button = this.buttonDisabled
    setTimeout(function () { $(".launchConfront").attr("disabled", button) }, 180)

  }

  /* ------------------ -------------------------- */
  _onDragStart(event) {
    super._onDragStart(event)
    console.log("DRAG", event)
    const diceData = {
      diceIndex: $(event.srcElement).data("dice-idx"),
      diceValue: $(event.srcElement).data("dice-value"),
    }
    event.dataTransfer.setData("text/plain", JSON.stringify(diceData));
  }

  /* -------------------------------------------- */
  _onDrop(event) {
    let dataJSON = event.dataTransfer.getData('text/plain')
    console.log("DICEDATA", dataJSON)
    let data = JSON.parse(dataJSON)
    let idx = Number(data.diceIndex)
    //console.log("DATA", data, event, event.srcElement.className)
    if (event.srcElement.className.includes("execution")) {
      this.rollData.availableDices[idx].location = "execution"
    }
    if (event.srcElement.className.includes("preservation")) {
      this.rollData.availableDices[idx].location = "preservation"
    }
    if (event.srcElement.className.includes("dice-list")) {
      this.rollData.availableDices[idx].location = "mainpool"
    }

    if (this.rollData.availableDices.filter(d => d.location == "execution").length == 2 && this.rollData.availableDices.filter(d => d.location == "preservation").length == 2) {
      this.buttonDisabled = false
    } else {
      this.buttonDisabled = true
    }

    // Manage total values
    this.computeTotals().catch("Error on dice pools")

  }
  /* -------------------------------------------- */
  processTranscendence() {
    // Apply Transcend if needed
    if (this.rollData.skillTranscendence > 0) {
      if (this.rollData.applyTranscendence == "execution") {
        this.rollData.executionTotal += this.rollData.skillTranscendence
      } else {
        this.rollData.preservationTotal += this.rollData.skillTranscendence
      }
    }
  }

  /* -------------------------------------------- */
  async computeTotals() {
    let rollData = this.rollData
    let actor = game.actors.get(rollData.actorId)

    rollData.executionTotal = rollData.availableDices.filter(d => d.location == "execution").reduce((previous, current) => {
      return previous + current.result
    }, rollData.skill.value)
    rollData.preservationTotal = rollData.availableDices.filter(d => d.location == "preservation").reduce((previous, current) => {
      return previous + current.result
    }, rollData.skill.value)
    this.processTranscendence()

    if (rollData.selectedSpecs && rollData.selectedSpecs.length > 0) {
      rollData.spec = actor.getSpecialization(rollData.selectedSpecs[0])
      this.rollData.executionTotal += "+2"
      this.rollData.preservationTotal += "+2"
    }
    rollData.bonusMalusTraits = 0
    for (let t of rollData.traits) {
      t.isBonus = false
      t.isMalus = false
    }
    if (rollData.traitsBonus && rollData.traitsBonus.length > 0) {
      rollData.traitsBonusList = []
      for (let id of rollData.traitsBonus) {
        let trait = rollData.traits.find(t => t._id == id)
        trait.isBonus = true
        rollData.traitsBonusList.push(trait)
        rollData.bonusMalusTraits += trait.system.level
      }
    }
    if (rollData.traitsMalus && rollData.traitsMalus.length > 0) {
      rollData.traitsMalusList = []
      for (let id of rollData.traitsMalus) {
        let trait = rollData.traits.find(t => t._id == id)
        trait.isMalus = true
        rollData.traitsMalusList.push(trait)
        rollData.bonusMalusTraits -= trait.system.level
      }
    }
    rollData.executionTotal += rollData.bonusMalusTraits
    rollData.executionTotal += rollData.bonusMalusPerso

    rollData.preservationTotal += rollData.bonusMalusTraits
    rollData.preservationTotal += rollData.bonusMalusPerso

    this.refreshDialog() 
  }

  /* -------------------------------------------- */
  activateListeners(html) {
    super.activateListeners(html);

    html.find('#bonusMalusPerso').change((event) => {
      this.rollData.bonusMalusPerso = Number(event.currentTarget.value)
      this.computeTotals()
    })
    html.find('#roll-specialization').change((event) => {
      this.rollData.selectedSpecs = $('#roll-specialization').val()
      this.computeTotals()
    })
    html.find('#roll-trait-bonus').change((event) => {
      this.rollData.traitsBonus = $('#roll-trait-bonus').val()
      this.computeTotals()
    })
    html.find('#roll-trait-malus').change((event) => {
      this.rollData.traitsMalus = $('#roll-trait-malus').val()
      this.computeTotals()
    })
    html.find('#roll-select-transcendence').change((event) => {
      this.rollData.skillTranscendence = Number($('#roll-select-transcendence').val())
      this.computeTotals()
    })
    html.find('#roll-apply-transcendence').change((event) => {
      this.rollData.applyTranscendence = $('#roll-apply-transcendence').val()
      this.computeTotals()
    })


  }
}