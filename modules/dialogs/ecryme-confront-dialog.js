import { EcrymeUtility } from "../common/ecryme-utility.js";
import { EcrymeRollDialog } from "./ecryme-roll-dialog.js";

export class EcrymeConfrontDialog extends Dialog {

  /* -------------------------------------------- */
  static async create(actor, rollData) {

    let options = mergeObject(super.defaultOptions, {
      classes: ["fvtt-ecryme ecryme-confrontation-dialog"],
      dragDrop: [{ dragSelector: ".confront-dice-container", dropSelector: null }],
      width: 620, height: 'fit-content', 'z-index': 99999
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
    console.log("MSG", this.rollData)
    msg.setFlag("world", "ecryme-rolldata", this.rollData)
  }

  /* -------------------------------------------- */
  async refreshDice() {
    this.rollData.filter = "execution"
    let content = await renderTemplate("systems/fvtt-ecryme/templates/dialogs/partial-confront-dice-area.hbs", this.rollData )
    content += await renderTemplate("systems/fvtt-ecryme/templates/dialogs/partial-confront-bonus-area.hbs", this.rollData )
    $("#confront-execution").html(content)

    this.rollData.filter = "preservation"
    content = await renderTemplate("systems/fvtt-ecryme/templates/dialogs/partial-confront-dice-area.hbs", this.rollData )
    content += await renderTemplate("systems/fvtt-ecryme/templates/dialogs/partial-confront-bonus-area.hbs", this.rollData )
    $("#confront-preservation").html(content)

    this.rollData.filter = "mainpool"
    content = await renderTemplate("systems/fvtt-ecryme/templates/dialogs/partial-confront-dice-area.hbs", this.rollData )
    $("#confront-dice-pool").html(content)
    content = await renderTemplate("systems/fvtt-ecryme/templates/dialogs/partial-confront-bonus-area.hbs", this.rollData )
    $("#confront-bonus-pool").html(content)
    
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
    let dragType = $(event.srcElement).data("drag-type")
    let diceData = {}
    //console.log("DRAGTYPE", dragType)
    if (dragType == "dice") {
      diceData = {
        dragType: "dice",
        diceIndex: $(event.srcElement).data("dice-idx"),
        diceValue: $(event.srcElement).data("dice-value"),
      }
    } else {
      diceData = {
        dragType: "bonus",
        bonusIndex: $(event.srcElement).data("bonus-idx"),
        bonusValue: 1
      }
    }
    event.dataTransfer.setData("text/plain", JSON.stringify(diceData));
  }

  /* -------------------------------------------- */
  _onDrop(event) {
    let dataJSON = event.dataTransfer.getData('text/plain')
    let data = JSON.parse(dataJSON)
    if ( data.dragType == "dice") {
      let idx = Number(data.diceIndex)
      //console.log("DATA", data, event, event.srcElement.className)
      if (event.srcElement.className.includes("execution") && 
        this.rollData.availableDices.filter(d => d.location == "execution").length < 2) {
        this.rollData.availableDices[idx].location = "execution"
      }
      if (event.srcElement.className.includes("preservation") && 
        this.rollData.availableDices.filter(d => d.location == "preservation").length < 2) {
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
    } else {
      let idx = Number(data.bonusIndex)
      if (event.srcElement.className.includes("execution")) {
        this.rollData.confrontBonus[idx].location = "execution"
      }
      if (event.srcElement.className.includes("preservation")) {
        this.rollData.confrontBonus[idx].location = "preservation"
      }
      if (event.srcElement.className.includes("bonus-list")) {
        this.rollData.confrontBonus[idx].location = "mainpool"
      }
    }

    // Manage total values
    this.computeTotals()

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
  computeTotals() {
    let rollData = this.rollData
    let actor = game.actors.get(rollData.actorId)

    rollData.executionTotal = rollData.availableDices.filter(d => d.location == "execution").reduce((previous, current) => {
      return previous + current.result
    }, rollData.skill.value)
    rollData.executionTotal = rollData.confrontBonus.filter(d => d.location == "execution").reduce((previous, current) => {
      return previous + 1
    }, rollData.executionTotal)

    rollData.preservationTotal = rollData.availableDices.filter(d => d.location == "preservation").reduce((previous, current) => {
      return previous + current.result
    }, rollData.skill.value)
    rollData.preservationTotal = rollData.confrontBonus.filter(d => d.location == "preservation").reduce((previous, current) => {
      return previous + 1
    }, rollData.preservationTotal)

    this.processTranscendence()

    if (rollData.selectedSpecs && rollData.selectedSpecs.length > 0) {
      rollData.spec = duplicate(actor.getSpecialization(rollData.selectedSpecs[0]))    
      rollData.specApplied = true
      rollData.executionTotal += 2
      rollData.preservationTotal += 2
    }
    if ( rollData.specApplied && rollData.selectedSpecs.length == 0) {
      rollData.spec = undefined
      rollData.specApplied = false
    }
    rollData.bonusMalusTraits = 0
    for (let t of rollData.traitsBonus) {
      t.activated = false
    }
    for (let t of rollData.traitsMalus) {
      t.activated = false
    }
    if (rollData.traitsBonusSelected && rollData.traitsBonusSelected.length > 0) {
      for (let id of rollData.traitsBonusSelected) {
        let trait = rollData.traitsBonus.find(t => t._id == id)
        trait.activated = true
        rollData.bonusMalusTraits += trait.system.level
      }
    }
    if (rollData.traitsMalusSelected && rollData.traitsMalusSelected.length > 0) {
      for (let id of rollData.traitsMalusSelected) {
        let trait = rollData.traitsMalus.find(t => t._id == id)
        trait.activated = true
        rollData.bonusMalusTraits -= trait.system.level
      }
    }

    rollData.executionTotal += rollData.bonusMalusTraits + rollData.bonusMalusPerso
    rollData.preservationTotal += rollData.bonusMalusTraits + rollData.bonusMalusPerso

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
      this.rollData.traitsBonusSelected = $('#roll-trait-bonus').val()
      this.computeTotals()
    })
    html.find('#roll-trait-malus').change((event) => {
      this.rollData.traitsMalusSelected = $('#roll-trait-malus').val()
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
    html.find('#annency-bonus').change((event) => {
      this.rollData.annencyBonus = Number(event.currentTarget.value)
    })

  }
}