import { EcrymeUtility } from "../common/ecryme-utility.js";

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class EcrymeItemSheet extends ItemSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["fvtt-ecryme", "sheet", "item"],
      template: "systems/fvtt-ecryme/templates/item-sheet.hbs",
      dragDrop: [{ dragSelector: null, dropSelector: null }],
      width: 620,
      height: 580,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }]
    });
  }

  /* -------------------------------------------- */
  _getHeaderButtons() {
    let buttons = super._getHeaderButtons();
    // Add "Post to chat" button
    // We previously restricted this to GM and editable items only. If you ever find this comment because it broke something: eh, sorry!
    buttons.unshift(
      {
        class: "post",
        icon: "fas fa-comment",
        onclick: ev => { }
      })
    return buttons
  }

  /* -------------------------------------------- */
  /** @override */
  setPosition(options = {}) {
    const position = super.setPosition(options);
    const sheetBody = this.element.find(".sheet-body");
    const bodyHeight = position.height - 192;
    sheetBody.css("height", bodyHeight);
    if (this.item.type.includes('weapon')) {
      position.width = 640;
    }
    return position;
  }

  /* -------------------------------------------- */
  async getData() {

    let formData = {
      title: this.title,
      id: this.id,
      type: this.object.type,
      img: this.object.img,
      name: this.object.name,
      editable: this.isEditable,
      cssClass: this.isEditable ? "editable" : "locked",
      system: duplicate(this.object.system),
      config: duplicate(game.system.ecryme.config),
      limited: this.object.limited,
      options: this.options,
      owner: this.document.isOwner,
      description: await TextEditor.enrichHTML(this.object.system.description, { async: true }),
      notes: await TextEditor.enrichHTML(this.object.system.notes, { async: true }),
      isGM: game.user.isGM
    }

    if ( this.object.type == "archetype")  {
      formData.tarots = EcrymeUtility.getTarots()
    }
    
    this.options.editable = !(this.object.origin == "embeddedItem");
    console.log("ITEM DATA", formData, this);
    return formData;
  }


  /* -------------------------------------------- */
  _getHeaderButtons() {
    let buttons = super._getHeaderButtons();
    buttons.unshift({
      class: "post",
      icon: "fas fa-comment",
      onclick: ev => this.postItem()
    });
    return buttons
  }

  /* -------------------------------------------- */
  postItem() {
    let chatData = duplicate(this.item)
    if (this.actor) {
      chatData.actor = { id: this.actor.id };
    }
    // Don't post any image for the item (which would leave a large gap) if the default image is used
    if (chatData.img.includes("/blank.png")) {
      chatData.img = null;
    }
    // JSON object for easy creation
    chatData.jsondata = JSON.stringify(
      {
        compendium: "postedItem",
        payload: chatData,
      });

    renderTemplate('systems/Ecryme/templates/post-item.html', chatData).then(html => {
      let chatOptions = EcrymeUtility.chatDataSetup(html);
      ChatMessage.create(chatOptions)
    });
  }

  /* -------------------------------------------- */
  async viewSubitem(ev) {
    let levelIndex = Number($(ev.currentTarget).parents(".item").data("level-index"))
    let choiceIndex = Number($(ev.currentTarget).parents(".item").data("choice-index"))
    let featureId = $(ev.currentTarget).parents(".item").data("feature-id")
    
    let itemData = this.object.system.levels[levelIndex].choices[choiceIndex].features[featureId]

    if (itemData.name != 'None') {
      let item = await Item.create(itemData, { temporary: true });
      item.system.origin = "embeddedItem";
      new EcrymeItemSheet(item).render(true);
    }
  }

  /* -------------------------------------------- */
  async deleteSubitem(ev) {
    let field = $(ev.currentTarget).data('type');
    let idx = Number($(ev.currentTarget).data('index'));
    let oldArray = this.object.system[field];
    let itemData = this.object.system[field][idx];
    if (itemData.name != 'None') {
      let newArray = [];
      for (var i = 0; i < oldArray.length; i++) {
        if (i != idx) {
          newArray.push(oldArray[i]);
        }
      }
      this.object.update({ [`system.${field}`]: newArray });
    }
  }

  /* -------------------------------------------- */
  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;


    // Update Inventory Item
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.object.options.actor.getOwnedItem(li.data("item-id"));
      item.sheet.render(true);
    });

    html.find('.delete-subitem').click(ev => {
      this.deleteSubitem(ev);
    });

    // Update Inventory Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      let itemId = li.data("item-id");
      let itemType = li.data("item-type");
    });

 }

  /* -------------------------------------------- */
  get template() {
    let type = this.item.type;
    return `systems/fvtt-ecryme/templates/items/item-${type}-sheet.hbs`
  }

  /* -------------------------------------------- */
  /** @override */
  _updateObject(event, formData) {
    return this.object.update(formData)
  }
}