/* ============ Инструменты листа настроек ============
   Вынесено из js/settings.js в 5.0: связь дополнительных списков с
   PC.settings, метка «изменено», «сбросить раздел», поиск по листу,
   резервная копия и «стереть всё». Вызывается один раз из js/app.js. ============ */
(function(PC){
  "use strict";
  var get = function(key){ return PC.settings.get(key); };
  var set = function(key, value){ PC.settings.set(key, value); };
  var DEFAULTS = PC.settings.DEFAULTS;

  /* ---------- дополнительные настройки 4.0 ----------
     С 4.3 их строки лежат в index.html (div.tisza-setting[data-setting]
     со списком select#setting-<ключ>, помеченным data-native, чтобы
     PC.dropdown его не подменял): подписи переводятся вместе с остальной
     разметкой. extend() только связывает списки с get/set и добавляет то,
     что относится ко всему листу: метку «изменено» у строки, «сбросить
     раздел», поиск, резервную копию и «стереть всё». Вызывается один раз
     из PC.tisza.init. */
  function extraControls(){
    return Array.from(document.querySelectorAll("#setPanels select[data-native][id^='setting-']"));
  }

  function node(tag, cls, text){
    var e = document.createElement(tag);
    if(cls) e.className = cls;
    if(text != null) e.textContent = text;
    return e;
  }

  function smallButton(text, onClick){
    var b = node("button", "btn small", text);
    b.type = "button";
    b.addEventListener("click", onClick);
    return b;
  }

  function bindExtraControls(){
    extraControls().forEach(function(control){
      var key = control.id.slice("setting-".length);
      control.value = get(key);
      control.addEventListener("change", function(){ set(key, control.value); });
    });
  }

  /* Метка «изменено» у строк, чьё значение отличается от исходного, и
     синхронизация дополнительных списков после «сбросить» и восстановления. */
  function markChanged(sheet){
    sheet.querySelectorAll(".set-row").forEach(function(row){
      var controls = Array.from(row.querySelectorAll("[data-set-switch],[data-set-seg]"));
      var different = row.dataset.setting
        ? get(row.dataset.setting) !== DEFAULTS[row.dataset.setting]
        : controls.some(function(c){ var k = c.dataset.setSwitch || c.dataset.setSeg; return get(k) !== DEFAULTS[k]; });
      row.classList.toggle("is-modified", different);
      row.title = different ? PC.t("set.modified") : "";
    });
    extraControls().forEach(function(control){ control.value = get(control.id.slice("setting-".length)); });
  }

  /* «Сбросить раздел» с отменой: прежние значения запоминаются и
     возвращаются кнопкой в уведомлении. */
  function addSectionResets(){
    document.querySelectorAll("#setPanels .set-group").forEach(function(group){
      group.appendChild(smallButton(PC.t("set.resetSection"), function(){
        var previous = {};
        group.querySelectorAll("[data-set-switch],[data-set-seg],[data-setting]").forEach(function(c){
          var k = c.dataset.setSwitch || c.dataset.setSeg || c.dataset.setting;
          previous[k] = get(k);
          set(k, DEFAULTS[k]);
        });
        PC.ui.toast(PC.t("set.resetDone"), false, {
          label:PC.t("ui.undo"),
          duration:5000,
          action:function(){ Object.keys(previous).forEach(function(k){ set(k, previous[k]); }); }
        });
      }));
    });
  }

  /* Поиск под шапкой листа, как в настройках iOS: он один на все разделы
     и виден и в списке разделов, и внутри раздела. */
  function addSearch(sheet){
    var search = node("input", "settings-search");
    search.type = "search";
    search.placeholder = PC.t("set.search");
    search.setAttribute("aria-label", PC.t("set.search"));
    sheet.insertBefore(search, sheet.querySelector(".sheet-body"));
    search.addEventListener("input", function(){
      var value = search.value.trim().toLowerCase();
      document.querySelectorAll("#setPanels .set-group").forEach(function(group){
        var matches = false;
        group.querySelectorAll(".set-row").forEach(function(row){
          row.hidden = !!value && row.textContent.toLowerCase().indexOf(value) < 0;
          if(!row.hidden) matches = true;
        });
        if(value) group.hidden = !matches;
      });
      PC.settings.searching(!!value);
      if(value) return;
      var active = sheet.querySelector('.setm-tab[aria-selected="true"]');
      if(PC.settings.drill()) PC.settings.root();
      else if(active) PC.settings.selectPanel(active.dataset.panel);
    });
  }

  /* Кнопки экспорта и импорта настроек. */
  function addBackupButtons(){
    var general = document.getElementById("setPanel-general");
    var actions = node("div", "set-actions");
    var input = node("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.hidden = true;
    input.id = "backupImport";
    actions.append(
      smallButton(PC.t("set.backup"), function(){
        var data = PC.backup.make();
        if(data) PC.exporter.download(new Blob([JSON.stringify(data, null, 2)], { type:"application/json" }), "politcompass-backup.json");
      }),
      smallButton(PC.t("set.restore"), function(){ input.click(); })
    );
    input.addEventListener("change", async function(){
      var file = input.files[0];
      if(!file) return;
      var data;
      try{
        if(file.size > 5000000) throw Error();
        data = JSON.parse(await file.text());
      }catch(e){
        PC.ui.toast(PC.t("set.badBackup"), true);
        return;
      }
      if(!PC.backup.restore(data)){
        PC.ui.toast(PC.t("set.badBackup"), true);
        return;
      }
      /* копия 4.x могла нести «Мою партию»: её ключи пропущены, и об этом
         надо сказать, а не промолчать */
      var skipped = PC.backup.skipped(data);
      PC.ui.toast(skipped.length ? PC.t("set.restoredSkip", { keys:skipped.join(", ") }) : PC.t("set.restored"));
      setTimeout(function(){ location.reload(); }, 600);
    });
    general.append(actions, input);
  }

  /* «Стереть всё» в разделе приватности: удаляет все pc-*, но оставляет
     в уведомлении кнопку «отменить», пока оно не исчезло. */
  function addEraseAll(){
    var privacy = document.getElementById("setPanel-privacy");
    privacy.appendChild(node("p", "set-meta", "pc-settings · pc-quiz-* · pc-selfvote · pc-eggs-found"));
    privacy.appendChild(smallButton(PC.t("set.eraseAll"), function(){
      var before = PC.backup.make();
      if(!before) return;
      Object.keys(before.data).concat(PC.backup.RETIRED).forEach(function(k){ PC.store.remove(k); });
      PC.quiz.clearLocal();
      if(PC.selfVote) PC.selfVote.clearLocal();
      PC.settings.reset();
      PC.compass.redraw();
      PC.refresh();
      PC.ui.toast(PC.t("set.resetDone"), false, {
        label:PC.t("ui.undo"),
        duration:5000,
        action:function(){ if(PC.backup.restore(before)) location.reload(); }
      });
    }));
  }

  function extend(){
    var sheet = document.getElementById("setSheet");
    addSearch(sheet);
    bindExtraControls();
    document.addEventListener("pc:settings", function(){ markChanged(sheet); });
    addSectionResets();
    addBackupButtons();
    addEraseAll();
    markChanged(sheet);
  }

  PC.settings.extend = extend;
})(window.PC = window.PC || {});
