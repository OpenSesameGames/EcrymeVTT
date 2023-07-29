/* -------------------------------------------- */
import { EcrymeUtility } from "../common/ecryme-utility.js";
import { EcrymeRollDialog } from "../dialogs/ecryme-roll-dialog.js";
import { EcrymeConfrontStartDialog } from "../dialogs/ecryme-confront-start-dialog.js";

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

    return super.create(data, options);
  }

  /* -------------------------------------------- */
  async prepareData() {
    super.prepareData()
  }

  /* -------------------------------------------- */
  prepareDerivedData() {
    super.prepareDerivedData();
  }

  /* -------------------------------------------- */
  _preUpdate(changed, options, user) {

    super._preUpdate(changed, options, user);
  }

  /* -------------------------------------------- */
  getMoneys() {
    let comp = this.items.filter(item => item.type == 'money');
    EcrymeUtility.sortArrayObjectsByName(comp)
    return comp;
  }
  getArchetype() {
    let comp = duplicate(this.items.find(item => item.type == 'archetype') || { name: "Pas d'archetype" })
    if (comp?.system) {
      comp.tarot = EcrymeUtility.getTarot(comp.system.lametutelaire)
    }

    return comp;
  }
  /* -------------------------------------------- */
  getConfrontations() {
    return this.items.filter(it => it.type == "confrontation")
  }
  getRollTraits() {
    return this.items.filter(it => it.type == "trait" && it.system.traitype == "normal")
  }
  getIdeal() {
    return this.items.find(it => it.type == "trait" && it.system.traitype == "ideal")
  }
  getSpleen() {
    return this.items.find(it => it.type == "trait" && it.system.traitype == "spleen")
  }

  /* -------------------------------------------- */
  getTrait(id) {
    //console.log("TRAITS", this.items, this.items.filter(it => it.type == "trait") )
    return this.items.find(it => it.type == "trait" && it._id == id)
  }
  /* -------------------------------------------- */
  getSpecialization(id) {
    let spec = this.items.find(it => it.type == "specialization" && it.id == id)
    return spec
  }
  /* -------------------------------------------- */
  getSpecializations(skillKey) {
    return this.items.filter(it => it.type == "specialization" && it.system.skillkey == skillKey)
  }
  /* -------------------------------------------- */
  prepareSkills() {
    let skills = duplicate(this.system.skills)
    for (let categKey in skills) {
      let category = skills[categKey]
      for (let skillKey in category.skilllist) {
        let skill = category.skilllist[skillKey]
        skill.spec = this.getSpecializations(skillKey)
      }
    }
    return skills
  }
  /* -------------------------------------------- */
  getCephalySkills() {
    let skills = duplicate(this.system.cephaly.skilllist)
    return skills
  }
  /* -------------------------------------------- */
  getImpacts() {
    let comp = duplicate(this.items.filter(item => item.type == 'impact') || [])
    return comp;
  }
  /* -------------------------------------------- */
  getWeapons() {
    let comp = duplicate(this.items.filter(item => item.type == 'weapon') || [])
    EcrymeUtility.sortArrayObjectsByName(comp)
    return comp;
  }
  getManeuvers() {
    let comp = duplicate(this.items.filter(item => item.type == 'maneuver') || [])
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
    if (item?.system) {
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

  /* ------------------------------------------- */
  getEquipments() {
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
    if (item?.system) {
      let update = { _id: item.id, "system.equipped": !item.system.equipped };
      await this.updateEmbeddedDocuments('Item', [update]); // Updates one EmbeddedEntity
    }
  }

  /* -------------------------------------------- */
  modifyImpact(impactType, impactLevel, modifier) {
    console.log(impactType, impactLevel, modifier)
    let current = this.system.impacts[impactType][impactLevel]
    if (modifier > 0) {
      while ( EcrymeUtility.getImpactMax(impactLevel) == current && impactLevel != "major") {
        impactLevel = EcrymeUtility.getNextImpactLevel(impactLevel)
        current = this.system.impacts[impactType][impactLevel]
      }  
    }
    let newImpact  = Math.max(this.system.impacts[impactType][impactLevel] + modifier, 0)
    this.update({ [`system.impacts.${impactType}.${impactLevel}`]: newImpact})
  }

  /* -------------------------------------------- */
  getImpactMalus(impactKey) {
    let impacts = this.system.impacts[impactKey]
    return - ((impacts.serious*2) + (impacts.major*4))
  }

  /* -------------------------------------------- */
  getImpactsMalus() {
    let impactsMalus = {
      physical: this.getImpactMalus("physical"),
      mental: this.getImpactMalus("mental"),
      social: this.getImpactMalus("social")
    }
    return impactsMalus
  }

  /* -------------------------------------------- */
  clearInitiative() {
    this.getFlag("world", "initiative", -1)
  }
  /* -------------------------------------------- */
  getInitiativeScore(combatId, combatantId) {
    let init = Math.floor((this.system.attributs.physique.value + this.system.attributs.habilite.value) / 2)
    let subValue = new Roll("1d20").roll({ async: false })
    return init + (subValue.total / 100)
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
  async incDecQuantity(objetId, incDec = 0) {
    let objetQ = this.items.get(objetId)
    if (objetQ) {
      let newQ = objetQ.system.quantity + incDec
      if (newQ >= 0) {
        await this.updateEmbeddedDocuments('Item', [{ _id: objetQ.id, 'system.quantity': newQ }]) // pdates one EmbeddedEntity
      }
    }
  }
  
  /* -------------------------------------------- */
  modifyConfrontBonus( modifier ) {
    let newBonus = this.system.internals.confrontbonus + bonus
    this.update({'system.internals.confrontbonus': newBonus})
  }

  /* -------------------------------------------- */
  spentSkillTranscendence(skill, value) {
    let newValue = this.system.skills[skill.categKey].skilllist[skill.skillKey].value - value
    newValue = Math.max(0, newValue)
    this.update({ [`system.skills.${skill.categKey}.skilllist.${skill.skillKey}.value`]: newValue })
  }

  /* -------------------------------------------- */
  getBonusList() {
    let bonusList = []
    for(let i=0; i<this.system.internals.confrontbonus; i++) {
      bonusList.push( { value: 1, type: "bonus", location: "mainpool"})
    }
    return bonusList
  }

  /* -------------------------------------------- */
  getCommonRollData() {
    //this.system.internals.confrontbonus = 5 // TO BE REMOVED!!!!
    let rollData = EcrymeUtility.getBasicRollData()
    rollData.alias = this.name
    rollData.actorImg = this.img
    rollData.actorId = this.id
    rollData.img = this.img
    rollData.isReroll = false
    rollData.traits = duplicate(this.getRollTraits())
    rollData.spleen = duplicate(this.getSpleen() || {})
    rollData.ideal = duplicate(this.getIdeal() || {})
    rollData.confrontBonus = this.getBonusList()

    return rollData
  }

  /* -------------------------------------------- */
  getCommonSkill(categKey, skillKey) {
    let skill = this.system.skills[categKey].skilllist[skillKey]
    let rollData = this.getCommonRollData()
    
    skill = duplicate(skill)
    skill.categKey = categKey
    skill.skillKey = skillKey
    skill.spec = this.getSpecializations(skillKey)

    rollData.skill = skill
    rollData.img = skill.img
    rollData.impactMalus = this.getImpactMalus(categKey)

    return rollData
  }

  /* -------------------------------------------- */
  rollSkill(categKey, skillKey) {
    let rollData = this.getCommonSkill(categKey, skillKey)
    rollData.mode = "skill"
    rollData.title = game.i18n.localize(rollData.skill.name)
    this.startRoll(rollData).catch("Error on startRoll")
  }

  /* -------------------------------------------- */
  async rollSkillConfront(categKey, skillKey) {
    let rollData = this.getCommonSkill(categKey, skillKey)
    rollData.mode = "skill"
    rollData.title = game.i18n.localize("ECRY.ui.confrontation") + " : " + game.i18n.localize(rollData.skill.name)
    rollData.executionTotal    = rollData.skill.value
    rollData.preservationTotal = rollData.skill.value
    rollData.applyTranscendence = "execution"
    rollData.traitsBonus = duplicate(rollData.traits)
    rollData.traitsMalus = duplicate(rollData.traits)
    let confrontStartDialog = await EcrymeConfrontStartDialog.create(this, rollData)
    confrontStartDialog.render(true)
  }
  /* -------------------------------------------- */
  async rollCephalySkillConfront(skillKey) {
    let rollData = this.getCommonRollData()
    rollData.mode = "cephaly"
    rollData.skill = duplicate(this.system.cephaly.skilllist[skillKey])
    rollData.img = rollData.skill.img
    rollData.skill.categKey = "cephaly"
    rollData.skill.skillKey = skillKey
    //rollData.impactMalus = this.getImpactMalus(categKey)
    rollData.title = game.i18n.localize("ECRY.ui.cephaly") + " : " + game.i18n.localize(rollData.skill.name)
    rollData.executionTotal    = rollData.skill.value
    rollData.preservationTotal = rollData.skill.value
    rollData.traitsBonus = duplicate(rollData.traits)
    rollData.traitsMalus = duplicate(rollData.traits)
    rollData.applyTranscendence = "execution"
    let confrontStartDialog = await EcrymeConfrontStartDialog.create(this, rollData)
    confrontStartDialog.render(true)
  }
  
  /* -------------------------------------------- */
  async rollWeaponConfront(weaponId) {
    let weapon = this.items.get(weaponId)
    let rollData
    if (weapon && weapon.system.weapontype == "melee") {
      rollData = this.getCommonSkill("physical", "fencing")
    } else {
      rollData = this.getCommonSkill("physical", "shooting")
    }
    rollData.mode = "weapon"
    rollData.weapon = duplicate(weapon)
    rollData.title = game.i18n.localize("ECRY.ui.confrontation") + " : " + game.i18n.localize(rollData.skill.name)
    rollData.executionTotal    = rollData.skill.value
    rollData.preservationTotal = rollData.skill.value
    rollData.applyTranscendence = "execution"
    let confrontStartDialog = await EcrymeConfrontStartDialog.create(this, rollData)
    confrontStartDialog.render(true)
  }

  /* -------------------------------------------- */
  rollWeapon(weaponId) {
    let weapon = this.items.get(weaponId)
    if (weapon) {
      weapon = duplicate(weapon)
      let rollData = this.getCommonRollData()
      if (weapon.system.armetype == "mainsnues" || weapon.system.armetype == "epee") {
        rollData.attr = { label: "(Physique+Habilité)/2", value: Math.floor((this.getPhysiqueMalus() + this.system.attributs.physique.value + this.system.attributs.habilite.value) / 2) }
      } else {
        rollData.attr = duplicate(this.system.attributs.habilite)
      }
      rollData.mode = "weapon"
      rollData.weapon = weapon
      rollData.img = weapon.img
      rollData.title = weapon.name
      this.startRoll(rollData).catch("Error on startRoll")
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
