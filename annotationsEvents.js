let globaIDIndex = 0

anno.on('createAnnotation', async (annotation, overrideId) => {
    overrideId(String(globaIDIndex));
    $('#zones').append(CreateInput(DefaultPermissions))
});

anno.on('selectAnnotation', function (annotation) {
    $('.input-overlay').children().children().hide();
    $("div[zone-id='" + annotation.id + "']").show();
});

anno.on('deleteAnnotation', function (annotation) {
    $("div[zone-id='" + annotation.id + "']").remove();
});

$('.input-overlay').on('click', '.close-button', function () {
    $(this).closest('.input-row').hide();
    anno.cancelSelected();
});

// 添加删除按钮的点击事件处理
$('.input-overlay').on('click', '.delete-button', function () {
    const zoneId = $(this).closest('.input-row').attr('zone-id');
    if (zoneId) {
        anno.removeAnnotation(anno.getAnnotationById(zoneId));
        $(this).closest('.input-row').remove();
    }
});


anno.on('cancelSelected', function (annotation) {
    $('.input-overlay').children().children().hide();
});

async function updateAnnotations() {

    const selected = anno.getSelected();

    if (selected !== undefined) {
        await anno.updateSelected(selected, true);
    }
}


$('#exportButton').click(function () {
    updateAnnotations().then(() => {
        setTimeout(() => {
            const data = {};
            data["global"] = { permissions: {} };

            // Export global permissions
            const globalInputRow = document.querySelector('#global .input-row');
            if (globalInputRow) {
                globalInputRow.querySelectorAll('.tab-pane').forEach(tabPane => {
                    tabPane.querySelectorAll('.instanceType').forEach(instanceType => {
                        const instanceTypeKey = instanceType.getAttribute('key');
                        data["global"]["permissions"][instanceTypeKey] = {};

                        instanceType.querySelectorAll('.category').forEach(category => {
                            const categoryKey = category.getAttribute('key');
                            data["global"]["permissions"][instanceTypeKey][categoryKey] = [];
                            if (categoryKey === 'world' && instanceTypeKey === 'Player') {
                                // 处理保护等级
                                const protectLevelInput = category.querySelector('.protect-level-input');
                                if (protectLevelInput) {
                                    const level = parseInt(protectLevelInput.value) || 1;
                                    data["global"]["permissions"][instanceTypeKey]["ProtectLevel"] = level;
                                    console.log("导出全局保护等级:", level);
                                } else {
                                    console.warn("全局保护等级输入框未找到");
                                }
                            }

                            category.querySelectorAll('.form-check-input').forEach(formCheckInput => {
                                if (formCheckInput.checked) {
                                    data["global"]["permissions"][instanceTypeKey][categoryKey].push(formCheckInput.getAttribute('val'));
                                }
                            });
                        });
                    });
                });
            } else {
                console.error("全局权限输入行未找到");
            }

            console.log("导出的全局权限数据:", JSON.stringify(data["global"], null, 2));

            const zones = [];

            // Export zone data
            document.querySelector('#zones').querySelectorAll('.input-row').forEach(row => {
                const input = {};

                // Capture the zone name from the input field, or default to 'PalZones' if empty
    let zoneNameInput = row.querySelector('.zone-name-input').value;
    input["name"] = zoneNameInput.trim() === "" ? "DPalZones" : zoneNameInput;

    input["points"] = [];
    var annotation = anno.getAnnotationById(row.getAttribute('zone-id'));
    var vectorPoints = annotation.target.selector.value;
    var pointsMatch = vectorPoints.match(/points=['"]([^'"]+)['"]/);
    if (pointsMatch && pointsMatch.length > 1) {
        var pointsString = pointsMatch[1];
        var pointsArray = pointsString.split(/\s+/);

        pointsArray.forEach(point => {
            var mappedX = ((parseFloat(point.split(',')[0]) / 8192) * 2000 - 1000) * 741 + -18100;
            var mappedY = ((parseFloat(point.split(',')[1]) / 8192) * -2000 + 1000) * 741 - 277000;
            input["points"].push({ x: mappedX, y: mappedY });
        });
    }

    input["permissions"] = {};
    row.querySelectorAll('.tab-pane').forEach(tabs => {

        tabs.querySelectorAll('.instanceType').forEach(instanceType => {
            const instanceTypeKey = instanceType.getAttribute('key');

            if (!input["permissions"][instanceTypeKey]) {
                input["permissions"][instanceTypeKey] = {};
            }

            instanceType.querySelectorAll('.category').forEach(category => {
                const categoryKey = category.getAttribute('key');

                if (!input["permissions"][instanceTypeKey][categoryKey]) {
                    input["permissions"][instanceTypeKey][categoryKey] = [];
                }

                if (categoryKey === 'world' && instanceTypeKey === 'Player') {
                    // 处理保护等级
                    const protectLevelInput = category.querySelector('.protect-level-input');
                    if (protectLevelInput) {
                        const level = parseInt(protectLevelInput.value);
                        if (!isNaN(level) && level > 0) {
                            input["permissions"][instanceTypeKey]["ProtectLevel"] = level;
                            console.log("导出区域保护等级:", level, "区域名称:", input["name"]);
                        } else {
                            console.warn("无效的保护等级值:", protectLevelInput.value);
                            input["permissions"][instanceTypeKey]["ProtectLevel"] = 1;
                        }
                    } else {
                        console.warn("区域保护等级输入框未找到");
                        input["permissions"][instanceTypeKey]["ProtectLevel"] = 1;
                    }
                }

                category.querySelectorAll('.form-check-input').forEach(formCheckInput => {
                    if (formCheckInput.checked) {
                        input["permissions"][instanceTypeKey][categoryKey].push(formCheckInput.getAttribute('val'));
                    }
                });
            });

        });
    });
    zones.push(input)
});


            data["zones"] = zones;

            // Convert the data to JSON string and download
            var jsonString = JSON.stringify(data, null, 2);
            var blob = new Blob([jsonString], { type: "application/json" });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'zones.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

        }, 1000);
    }).catch(error => {
        console.error(error);
    });
});




$('#importButton').click(function () {
    var input = $('<input type="file">');
    input.on('change', function (e) {
        var file = e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function (e) {
            try {
                var importedData = JSON.parse(e.target.result);
                var annotationData = []

                console.log("Imported data:", JSON.stringify(importedData, null, 2));

                $('.input-overlay').children().empty();

                // 处理全局权限
                if (importedData.global && importedData.global.permissions) {
                    let globalPerms = importedData.global.permissions;
                    if (globalPerms.Player) {
                        // 确保 ProtectLevel 存在且为数字
                        if (globalPerms.Player.ProtectLevel !== undefined) {
                            let protectLevel = parseInt(globalPerms.Player.ProtectLevel);
                            if (!isNaN(protectLevel)) {
                                globalPerms.Player.ProtectLevel = protectLevel;
                                console.log("导入全局保护等级:", protectLevel);
                            } else {
                                console.warn("无效的全局保护等级，使用默认值 1");
                                globalPerms.Player.ProtectLevel = 1;
                            }
                        } else {
                            console.log("全局保护等级未定义，设置默认值 1");
                            globalPerms.Player.ProtectLevel = 1;
                        }
                    } else {
                        console.warn("全局权限中未找到 Player 类型，创建默认配置");
                        globalPerms.Player = { ProtectLevel: 1 };
                    }
                    
                    // 在创建输入框之前打印全局权限数据
                    console.log("全局权限数据:", JSON.stringify(globalPerms, null, 2));
                } else {
                    console.warn("未找到全局权限数据，创建默认配置");
                    importedData.global = { permissions: { Player: { ProtectLevel: 1 } } };
                }

                $('#global').empty().append(CreateInput(importedData.global.permissions, "", true));

                importedData.zones.forEach(zone => {
                    let points = []

                    zone.points.forEach(data => {
                        let originalX = ((data.x - -18100) / 741 + 1000) * (8192 / 2000);
                        let originalY = -((data.y + 277000) / 741 - 1000) * (8192 / 2000);
                        points.push(`${originalX},${originalY}`);
                    })

                    annotationData.push({
                        "@context": "http://www.w3.org/ns/anno.jsonld",
                        "body": [],
                        "id": String(globaIDIndex),
                        "type": "Annotation",
                        "target": {
                            "selector": {
                                "type": "SvgSelector",
                                "value": `<svg><polygon points="${points.join(' ')}"></polygon></svg>`
                            }
                        }
                    })

                    // 处理区域权限
                    if (zone.permissions && zone.permissions.Player) {
                        let playerPerms = zone.permissions.Player;
                        if (playerPerms.ProtectLevel) {
                            // 确保 ProtectLevel 是数字
                            playerPerms.ProtectLevel = Array.isArray(playerPerms.ProtectLevel) 
                                ? playerPerms.ProtectLevel[0] 
                                : parseInt(playerPerms.ProtectLevel);
                            console.log("Zone ProtectLevel - Name:", zone.name, "Level:", playerPerms.ProtectLevel);
                        }
                    }

                    // 添加区域
                    $('#zones').append(CreateInput(zone.permissions, zone.name))
                })

                anno.setAnnotations(annotationData);
            } catch (error) {
                console.error("Import error:", error);
            }
        };
        reader.readAsText(file);
    });
    input.click();
});



function CreateInput(permissions, zoneName = "", isGlobal = false) {
    console.log("CreateInput called with:", JSON.stringify({ permissions, zoneName, isGlobal }, null, 2));
    console.log("Creating input, isGlobal:", isGlobal);  // Debug log to check flag
    
	var deleteButtonHTML=`
        <button type="button" class="delete-button" style="position: absolute; right: 50px; top: 10px; font-size: 20px; background-color: transparent; border: none; color: red; cursor: pointer; z-index: 1000;">
            <i class="fas fa-trash"></i>
        </button>`;
	
	var closeButtonHTML=`
        <button type="button" class="close-button" style="position: absolute; right: 10px; top: 10px; font-size: 20px; background-color: transparent; border: none; color: white;">
            <i class="fas fa-times"></i>
        </button>`;

    var inputRow = $(`
    <div class="input-row row g-0" style="display: none;" zone-id="${isGlobal ? "" : globaIDIndex}">
        ${isGlobal ? `
        <div class="header col-12" style="position: relative; display: flex; justify-content: center; align-items: center; height: 50px;">
            <strong style="font-size: 18px; color: white; z-index: 1;">全局权限设置</strong>
            ${closeButtonHTML}</div>` : `
        <div class="col-10 d-flex align-items-end">
            <input type="text" class="form-control zone-name-input" placeholder="输入区域名称" value="${zoneName}">
        </div>
        <div class="col-2 text-right">
		${closeButtonHTML}${deleteButtonHTML}
        </div>`}

        <ul class="nav nav-tabs nav-fill">
            <li class="nav-item col-4">
                <button class="btn  text-white active fs-10 shadow" data-bs-toggle="tab" href="#Players-${globaIDIndex}">玩家</button>
            </li>
            <li class="nav-item col-4">
                <button class="btn  text-white fs-10 shadow" data-bs-toggle="tab" href="#WildPals-${globaIDIndex}">野伙伴</button>
            </li>
            <li class="nav-item col-4">
                <button class="btn  text-white fs-10 shadow" data-bs-toggle="tab" href="#Npcs-${globaIDIndex}">NPC</button>
            </li>
            <li class="nav-item col-6">
                <button class="btn  text-white fs-10 shadow" data-bs-toggle="tab" href="#PlayersPals-${globaIDIndex}">玩家持有的朋友</button>
            </li>
            <li class="nav-item col-6">
                <button class="btn  text-white fs-10 shadow" data-bs-toggle="tab" href="#BasePals-${globaIDIndex}">玩家基地伙伴</button>
            </li>
        </ul>

        <div class="tab-content mt-3">

            <div class="tab-pane fade show active" id="Players-${globaIDIndex}">
                <div class="instanceType" key="Player">
                    <div class="category" key="world">
                        <span>非管理员可以：</span>
                        <div class="form-check form-switch">
                            <input class="form-check-input" val="Build" type="checkbox" role="switch">
                            <label class="form-check-label"> 构建结构</label>
                        </div>
                        <div class="form-check form-switch">
                            <input class="form-check-input" val="Dismantle" type="checkbox" role="switch">
                            <label class="form-check-label"> 拆除结构</label>
                        </div>

                        <div class="form-check form-switch">
                            <input class="form-check-input" val="Ride" type="checkbox" role="switch">
                            <label class="form-check-label"> 骑陆地坐骑</label>
                        </div>
                        <div class="form-check form-switch">
                            <input class="form-check-input" val="Fly" type="checkbox" role="switch">
                            <label class="form-check-label"> 骑乘飞行坐骑</label>
                        </div>
						<div class="form-check form-switch">
                            <input class="form-check-input" val="OpenTreasure" type="checkbox" role="switch">
                            <label class="form-check-label"> 打开宝箱</label>
                        </div>
                        <div class="form-check form-switch">
                            <input class="form-check-input" val="Theplayerenters" type="checkbox" role="switch">
                            <label class="form-check-label"> 不限制进入</label>
                        </div>
                        <div class="form-group">
                            <label for="protectLevel">进入限制等级：</label>
                            <input type="number" class="form-control protect-level-input ${isGlobal ? 'global-protect-level' : 'zone-protect-level'}" min="1" value="1" style="width: 100px;">
                        </div>
                    </div>
                    <div class="category" key="damage">
                        <span>可以造成伤害：</span>
                        <div class="form-check form-switch">
                            <input class="form-check-input" val="Player" type="checkbox" role="switch">
                            <label class="form-check-label">玩家</label>
                        </div>
                        <div class="form-check form-switch">
                            <input class="form-check-input" val="Companion" type="checkbox" role="switch">
                            <label class="form-check-label">玩家持有的朋友</label>
                        </div>
                        <div class="form-check form-switch">
                            <input class="form-check-input" val="BaseCampPal" type="checkbox" role="switch">
                            <label class="form-check-label">玩家基地伙伴</label>
                        </div>
                        <div class="form-check form-switch">
                            <input class="form-check-input" val="WildPal" type="checkbox" role="switch">
                            <label class="form-check-label">野伙伴</label>
                        </div>
                        <div class="form-check form-switch">
                            <input class="form-check-input" val="NPC" type="checkbox" role="switch">
                            <label class="form-check-label">NPC</label>
                        </div>
                        <div class="form-check form-switch">
                            <input class="form-check-input" val="Structure" type="checkbox" role="switch">
                            <label class="form-check-label">结构</label>
                        </div>
                    </div>
                </div>
            </div>


            <div class="tab-pane fade show" id="PlayersPals-${globaIDIndex}">
                <div class="instanceType" key="Companion">
                    <div class="category" key="damage">
                        <span>可以造成伤害：</span>
                        <div class="form-check form-switch">
                            <input class="form-check-input" val="Player" type="checkbox" role="switch">
                            <label class="form-check-label">玩家</label>
                        </div>
                        <div class="form-check form-switch">
                            <input class="form-check-input" val="Companion" type="checkbox" role="switch">
                            <label class="form-check-label">玩家持有的朋友</label>
                        </div>
                        <div class="form-check form-switch">
                            <input class="form-check-input" val="BaseCampPal" type="checkbox" role="switch">
                            <label class="form-check-label">玩家基地伙伴</label>
                        </div>
                        <div class="form-check form-switch">
                            <input class="form-check-input" val="WildPal" type="checkbox" role="switch">
                            <label class="form-check-label">野伙伴</label>
                        </div>
                        <div class="form-check form-switch">
                            <input class="form-check-input" val="NPC" type="checkbox" role="switch">
                            <label class="form-check-label">NPC</label>
                        </div>
                        <div class="form-check form-switch">
                            <input class="form-check-input" val="Structure" type="checkbox" role="switch">
                            <label class="form-check-label">结构</label>
                        </div>
                    </div>
                </div>
            </div>

            <div class="tab-pane fade show" id="BasePals-${globaIDIndex}">
                <div class="instanceType" key="BaseCampPal">
                    <div class="category" key="damage">
                        <span>可以造成伤害：</span>
                        <div class="form-check form-switch">
                            <input class="form-check-input" val="Player" type="checkbox" role="switch">
                            <label class="form-check-label">玩家</label>
                        </div>
                        <div class="form-check form-switch">
                            <input class="form-check-input" val="Companion" type="checkbox" role="switch">
                            <label class="form-check-label">玩家持有的朋友</label>
                        </div>
                        <div class="form-check form-switch">
                            <input class="form-check-input" val="BaseCampPal" type="checkbox" role="switch">
                            <label class="form-check-label">玩家基地伙伴</label>
                        </div>
                        <div class="form-check form-switch">
                            <input class="form-check-input" val="WildPal" type="checkbox" role="switch">
                            <label class="form-check-label">野伙伴</label>
                        </div>
                        <div class="form-check form-switch">
                            <input class="form-check-input" val="NPC" type="checkbox" role="switch">
                            <label class="form-check-label">NPC</label>
                        </div>
                        <div class="form-check form-switch">
                            <input class="form-check-input" val="Structure" type="checkbox" role="switch">
                            <label class="form-check-label">结构</label>
                        </div>
                    </div>
                </div>
            </div>

            <div class="tab-pane fade show" id="WildPals-${globaIDIndex}">
                <div class="instanceType" key="WildPal">
                    <div class="category" key="damage">
                        <span>可以造成伤害：</span>
                        <div class="form-check form-switch">
                            <input class="form-check-input" val="Player" type="checkbox" role="switch">
                            <label class="form-check-label">玩家</label>
                        </div>
                        <div class="form-check form-switch">
                            <input class="form-check-input" val="Companion" type="checkbox" role="switch">
                            <label class="form-check-label">玩家持有的朋友</label>
                        </div>
                        <div class="form-check form-switch">
                            <input class="form-check-input" val="BaseCampPal" type="checkbox" role="switch">
                            <label class="form-check-label">玩家基地伙伴</label>
                        </div>
                        <div class="form-check form-switch">
                            <input class="form-check-input" val="WildPal" type="checkbox" role="switch">
                            <label class="form-check-label">野伙伴</label>
                        </div>
                        <div class="form-check form-switch">
                            <input class="form-check-input" val="NPC" type="checkbox" role="switch">
                            <label class="form-check-label">NPC</label>
                        </div>
                        <div class="form-check form-switch">
                            <input class="form-check-input" val="Structure" type="checkbox" role="switch">
                            <label class="form-check-label">结构</label>
                        </div>
                    </div>
                </div>
            </div>

            <div class="tab-pane fade show" id="Npcs-${globaIDIndex}">
                <div class="instanceType" key="NPC">
                    <div class="category" key="damage">
                        <span>可以造成伤害：</span>
                        <div class="form-check form-switch">
                            <input class="form-check-input" val="Player" type="checkbox" role="switch">
                            <label class="form-check-label">玩家</label>
                        </div>
                        <div class="form-check form-switch">
                            <input class="form-check-input" val="Companion" type="checkbox" role="switch">
                            <label class="form-check-label">玩家持有的朋友</label>
                        </div>
                        <div class="form-check form-switch">
                            <input class="form-check-input" val="BaseCampPal" type="checkbox" role="switch">
                            <label class="form-check-label">玩家基地伙伴</label>
                        </div>
                        <div class="form-check form-switch">
                            <input class="form-check-input" val="WildPal" type="checkbox" role="switch">
                            <label class="form-check-label">野伙伴</label>
                        </div>
                        <div class="form-check form-switch">
                            <input class="form-check-input" val="NPC" type="checkbox" role="switch">
                            <label class="form-check-label">NPC</label>
                        </div>
                        <div class="form-check form-switch">
                            <input class="form-check-input" val="Structure" type="checkbox" role="switch">
                            <label class="form-check-label">结构</label>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    </div>
    `);

    // Code to handle checkbox states and populate tabs with permissions
    $.each(permissions, function (category, actions) {
        var categoryDiv = inputRow.find('.instanceType[key=\"' + category + '\"]');
        $.each(actions, function (action, values) {
            if (action === 'ProtectLevel' && category === 'Player') {
                // 设置保护等级 - 处理数组或数字格式
                var protectLevelValue;
                if (Array.isArray(values)) {
                    protectLevelValue = values[0];
                } else if (typeof values === 'number') {
                    protectLevelValue = values;
                } else {
                    protectLevelValue = parseInt(values) || 1;
                }
                
                // 根据是否为全局选择不同的保护等级输入框
                var protectInput;
                if (isGlobal) {
                    protectInput = inputRow.find('.global-protect-level');
                    console.log("查找全局保护等级输入框:", protectInput.length);
                } else {
                    protectInput = inputRow.find('.zone-protect-level');
                    console.log("查找区域保护等级输入框:", protectInput.length);
                }
                
                if (protectInput.length > 0) {
                    protectInput.val(protectLevelValue);
                    console.log("设置保护等级 - " + (isGlobal ? "Global" : "Zone: " + zoneName) + ", Level:", protectLevelValue);
                    
                    // 添加事件监听器，在值变化时更新permissions对象
                    protectInput.off('change').on('change', function() {
                        var newValue = parseInt($(this).val()) || 1;
                        permissions[category].ProtectLevel = newValue;
                        console.log("更新保护等级 - " + (isGlobal ? "Global" : "Zone: " + zoneName) + ", New Level:", newValue);
                    });
                } else {
                    console.error("找不到保护等级输入框 - " + (isGlobal ? "Global" : "Zone: " + zoneName));
                    console.log("Input row HTML:", inputRow.html());
                }
            } else {
                var actionDiv = categoryDiv.find('.category[key=\"' + action + '\"]');
                if (Array.isArray(values)) {
                    // 处理数组格式的权限
                    values.forEach(function (value) {
                        var checkbox = actionDiv.find('input[val=\"' + value + '\"]');
                        if (checkbox.length > 0) {
                            checkbox.prop('checked', true);
                        }
                    });
                } else if (typeof values === 'object') {
                    // 处理对象格式的权限（兼容旧格式）
                    Object.values(values).forEach(function (value) {
                        var checkbox = actionDiv.find('input[val=\"' + value + '\"]');
                        if (checkbox.length > 0) {
                            checkbox.prop('checked', true);
                        }
                    });
                }
            }
        });
    });

    globaIDIndex += 1;
    return inputRow;
}
