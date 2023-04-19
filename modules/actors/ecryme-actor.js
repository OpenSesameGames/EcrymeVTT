/* -------------------------------------------- */
import { EcrymeUtility } from "./common/ecryme-utility.js";
import { EcrymeRollDialog } from "./dialogs/ecryme-roll-dialog.js";


/* -------------------------------------------- */
/* -------------------------------------------- */
/**
 * Extend the base Actor entity by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class EcrymeActor extends Actor {

  /* -------------------------------------------- */
  /**
   * Override the create() function to provide additional SoS functionality.
   *
   * This overrided create() function adds initial items 
   * Namely: Basic skills, money, 
   *
   * @param {Object} data        Barebones actor data which this function adds onto.
   * @param {Object} options     (Unused) Additional options which customize the creation workflow.
   *
   */

  static async create(data, options) {

    // Case of compendium global import
    if (data instanceof Array) {
      return super.create(data, options);
    }
    // If the created actor has items (only applicable to duplicated actors) bypass the new actor creation logic
    if (data.items) {
      let actor = super.create(data, options);
      return actor;
    }

    if (data.type == 'character') {
    }
    if (data.type == 'npc') {
    }

    return super.create(data, options);
  }

  /* -------------------------------------------- */
  prepareBaseData() {
  }

  /* -------------------------------------------- */
  async prepareData() {

    super.prepareData()

  }

  /* -------------------------------------------- */
  computeHitPoints() {
    if (this.type == "character") {
    }
  }

  /* -------------------------------------------- */
  prepareDerivedData() {

    if (this.type == 'character' || game.user.isGM) {
    }

    super.prepareDerivedData();
  }

  /* -------------------------------------------- */
  _preUpdate(changed, options, user) {

    super._preUpdate(changed, options, user);
  }

  /*_onUpdateEmbeddedDocuments( embeddedName, ...args ) {
    this.rebuildSkills()
    super._onUpdateEmbeddedDocuments(embeddedName, ...args)
  }*/

  /* -------------------------------------------- */
  getMoneys() {
    let comp = this.items.filter(item => item.type == 'money');
    EcrymeUtility.sortArrayObjectsByName(comp)
    return comp;
  }
  getSorts() {
    let comp = this.items.filter(item => item.type == 'sortilege');
    EcrymeUtility.sortArrayObjectsByName(comp)
    return comp;
  }
  getArchetype() {
    let comp = duplicate(this.items.find(item => item.type == 'archetype') || {name: "Pas d'archetype"})
    if (comp && comp.system) {
      comp.tarot = EcrymeUtility.getTarot(comp.system.lametutelaire)
    }

    return comp;
  }
  /* -------------------------------------------- */
  getElementsBio() {
    let comp = duplicate(this.items.filter(item => item.type == 'elementbio') || [])
    EcrymeUtility.sortArrayObjectsByName(comp)
    return comp;
  }
  /* -------------------------------------------- */
  getTarots() {
    let comp = duplicate(this.items.filter(item => item.type == 'tarot' && !item.system.isgm) || [])
    EcrymeUtility.sortArrayObjectsByName(comp)
    return comp;
  }
  /* -------------------------------------------- */
  getHiddenTarots() {
    let comp = duplicate(this.items.filter(item => item.type == 'tarot' && item.system.isgm) || [])
    EcrymeUtility.sortArrayObjectsByName(comp)
    return comp;
  }
  /* -------------------------------------------- */
  getArmes() {
    let comp = duplicate(this.items.filter(item => item.type == 'arme') || [])
    EcrymeUtility.sortArrayObjectsByName(comp)
    return comp;
  }
  /* -------------------------------------------- */
  getItemById(id) {
    let item = this.items.find(item => item.id == id);
    if (item) {
      item = duplicate(item)
    }
    return item;
  }

  /* -------------------------------------------- */
  async equipItem(itemId) {
    let item = this.items.find(item => item.id == itemId)
    if (item && item.system) {
      if (item.type == "armor") {
        let armor = this.items.find(item => item.id != itemId && item.type == "armor" && item.system.equipped)
        if (armor) {
          ui.notifications.warn("You already have an armor equipped!")
          return
        }
      }
      if (item.type == "shield") {
        let shield = this.items.find(item => item.id != itemId && item.type == "shield" && item.system.equipped)
        if (shield) {
          ui.notifications.warn("You already have a shield equipped!")
          return
        }
      }
      let update = { _id: item.id, "system.equipped": !item.system.equipped };
      await this.updateEmbeddedDocuments('Item', [update]); // Updates one EmbeddedEntity
    }
  }

  /* -------------------------------------------- */
  compareName(a, b) {
    if (a.name < b.name) {
      return -1;
    }
    if (a.name > b.name) {
      return 1;
    }
    return 0;
  }

  /* ------------------------------------------- */
  getEquipements() {
    return this.items.filter(item => item.type == 'equipement')
  }

  /* ------------------------------------------- */
  async buildContainerTree() {
    let equipments = duplicate(this.items.filter(item => item.type == "equipment") || [])
    for (let equip1 of equipments) {
      if (equip1.system.iscontainer) {
        equip1.system.contents = []
        equip1.system.contentsEnc = 0
        for (let equip2 of equipments) {
          if (equip1._id != equip2.id && equip2.system.containerid == equip1.id) {
            equip1.system.contents.push(equip2)
            let q = equip2.system.quantity ?? 1
            equip1.system.contentsEnc += q * equip2.system.weight
          }
        }
      }
    }

    // Compute whole enc
    let enc = 0
    for (let item of equipments) {
      //item.data.idrDice = EcrymeUtility.getDiceFromLevel(Number(item.data.idr))
      if (item.system.equipped) {
        if (item.system.iscontainer) {
          enc += item.system.contentsEnc
        } else if (item.system.containerid == "") {
          let q = item.system.quantity ?? 1
          enc += q * item.system.weight
        }
      }
    }
    for (let item of this.items) { // Process items/shields/armors
      if ((item.type == "weapon" || item.type == "shield" || item.type == "armor") && item.system.equipped) {
        let q = item.system.quantity ?? 1
        enc += q * item.system.weight
      }
    }

    // Store local values
    this.encCurrent = enc
    this.containersTree = equipments.filter(item => item.system.containerid == "") // Returns the root of equipements without container

  }

  /* -------------------------------------------- */
  async equipGear(equipmentId) {
    let item = this.items.find(item => item.id == equipmentId);
    if (item && item.system) {
      let update = { _id: item.id, "system.equipped": !item.system.equipped };
      await this.updateEmbeddedDocuments('Item', [update]); // Updates one EmbeddedEntity
    }
  }

  /* -------------------------------------------- */
  clearInitiative(){
    this.getFlag("world", "initiative", -1)
  }
  /* -------------------------------------------- */
  getInitiativeScore(combatId, combatantId) {
    let init = Math.floor( (this.system.attributs.physique.value+this.system.attributs.habilite.value) / 2)
    let subvalue = new Roll("1d20").roll({async: false})
    return init + (subvalue.total / 100)
  }

  /* -------------------------------------------- */
  getSubActors() {
    let subActors = [];
    for (let id of this.system.subactors) {
      subActors.push(duplicate(game.actors.get(id)))
    }
    return subActors;
  }
  /* -------------------------------------------- */
  async addSubActor(subActorId) {
    let subActors = duplicate(this.system.subactors);
    subActors.push(subActorId);
    await this.update({ 'system.subactors': subActors });
  }
  /* -------------------------------------------- */
  async delSubActor(subActorId) {
    let newArray = [];
    for (let id of this.system.subactors) {
      if (id != subActorId) {
        newArray.push(id);
      }
    }
    await this.update({ 'system.subactors': newArray });
  }

  /* -------------------------------------------- */
  async deleteAllItemsByType(itemType) {
    let items = this.items.filter(item => item.type == itemType);
    await this.deleteEmbeddedDocuments('Item', items);
  }

  /* -------------------------------------------- */
  async addItemWithoutDuplicate(newItem) {
    let item = this.items.find(item => item.type == newItem.type && item.name.toLowerCase() == newItem.name.toLowerCase())
    if (!item) {
      await this.createEmbeddedDocuments('Item', [newItem]);
    }
  }
  /* -------------------------------------------- */
  incDecFluide(value) {
    let fluide = this.system.fluide + value
    this.update( {'system.fluide': fluide} )
  }
  incDecDestin(value) {
    let destin = this.system.pointdestin + value
    this.update( {'system.pointdestin': destin} )
  }
  incDecMPMB(value) {
    let mpmb = this.system.mpmb + value
    this.update( {'system.mpmb': mpmb} )
  }
  incDecMPMN(value) {
    let mpmn = this.system.mpmn + value
    this.update( {'system.mpmn': mpmn} )
  }
  /* -------------------------------------------- */
  incDecAttr(attrKey, value) {
    let attr = duplicate(this.system.attributs[attrKey])
    attr.value += value
    this.update( { [`system.attributs.${attrKey}`]: attr})    
  }
  /* -------------------------------------------- */
  async incDecQuantity(objetId, incDec = 0) {
    let objetQ = this.items.get(objetId)
    if (objetQ) {
      let newQ = objetQ.system.quantity + incDec
      if (newQ >= 0) {
        const updated = await this.updateEmbeddedDocuments('Item', [{ _id: objetQ.id, 'system.quantity': newQ }]) // pdates one EmbeddedEntity
      }
    }
  }
  /* -------------------------------------------- */
  async incDecAmmo(objetId, incDec = 0) {
    let objetQ = this.items.get(objetId)
    if (objetQ) {
      let newQ = objetQ.system.ammocurrent + incDec;
      if (newQ >= 0 && newQ <= objetQ.system.ammomax) {
        const updated = await this.updateEmbeddedDocuments('Item', [{ _id: objetQ.id, 'system.ammocurrent': newQ }]); // pdates one EmbeddedEntity
      }
    }
  }

  /* -------------------------------------------- */
  getAtttributImage( attrKey) {
    return `systems/fvtt-ecryme/images/icons/${attrKey}.webp`
  }

  /* -------------------------------------------- */
  incDecDestin( value) {
    let newValue = Math.max( this.system.pointdestin + value, 0)    
    this.update( {'system.pointdestin': newValue})
  }
  
  /* -------------------------------------------- */
  getCommonRollData() {

    let rollData = EcrymeUtility.getBasicRollData()
    rollData.alias = this.name
    rollData.actorImg = this.img
    rollData.actorId = this.id
    rollData.img = this.img
    rollData.phyMalus = this.getPhysiqueMalus()
    rollData.elementsbio = this.getElementsBio()
    rollData.destin = this.system.pointdestin
    rollData.isReroll = false
    rollData.confrontationDegre = 0
    rollData.confrontationModif = 0

    console.log("ROLLDATA", rollData)

    return rollData
  }
  /* -------------------------------------------- */
  getPhysiqueMalus() {
    if ( this.system.attributs.constitution.value <= 8) {
      return -(9 - this.system.attributs.constitution.value)
    }
    return 0
  }

  /* -------------------------------------------- */
  rollAttribut(attrKey) {
    let attr = this.system.attributs[attrKey]
    let rollData = this.getCommonRollData()
    rollData.attr = duplicate(attr)
    rollData.mode = "attribut"
    rollData.title = attr.label 
    rollData.img = this.getAtttributImage(attrKey)
    this.startRoll(rollData)
  }

  /* -------------------------------------------- */
  rollArme(weaponId) {
    let arme = this.items.get(weaponId)
    if (arme) {
      arme = duplicate(arme)
      let rollData = this.getCommonRollData()
      if (arme.system.armetype == "mainsnues" || arme.system.armetype == "epee") {
        rollData.attr = { label: "(Physique+Habilité)/2", value: Math.floor( (this.getPhysiqueMalus()+this.system.attributs.physique.value+this.system.attributs.habilite.value) / 2) }
      } else {
        rollData.attr = duplicate(this.system.attributs.habilite)
      }
      rollData.mode = "arme"
      rollData.arme = arme
      rollData.img = arme.img
      rollData.title = arme.name
      this.startRoll(rollData)
    } else {
      ui.notifications.warn("Impossible de trouver l'arme concernée ")
    }
  }
  
  /* -------------------------------------------- */
  async startRoll(rollData) {
    let rollDialog = await EcrymeRollDialog.create(this, rollData)
    rollDialog.render(true)
  }

}
