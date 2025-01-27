
var talentPointsSpent = {}
var classData = {}
const re = /a{2,}|b{2,}|c{2,}|d{2,}|e{2,}/g //only looks for repeats of a/b/c/d/e atm
const re2 = /([a-z])\d/g
const re3 = /(?:.* \[)(.+)(?:\] .)/

const CLASS_ARR = ['druid', 'hunter', 'mage', 'paladin', 'priest', 'rogue', 'shaman', 'warlock', 'warrior']

const translationTable = {
	00: 'a', 01: 'b', 02: 'c', 03: 'd', 04: 'e', 05: 'f',
	10: 'g', 11: 'h', 12: 'i', 13: 'j', 14: 'k', 15: 'l',
	20: 'm', 21: 'n', 22: 'o', 23: 'p', 24: 'q', 25: 'r',
	30: 's', 31: 't', 32: 'u', 33: 'v', 34: 'w', 35: 'x',
	40: 'y', 41: 'z', 42: 'A', 43: 'B', 44: 'C', 45: 'D',
	50: 'E', 51: 'F', 52: 'G', 53: 'H', 54: 'I', 55: 'J', 07: 'Y', 08: 'Z'
}

const reversedTable = {}
Object.values(translationTable).forEach(function (item, index) {
	let repl = (Object.keys(translationTable)[index].length > 1) ? Object.keys(translationTable)[index] : "0" + Object.keys(translationTable)[index]
	reversedTable[item] = repl
})

function TalentSpec(url, className, name, points) {
	this.url = url
	this.className = className
	this.name = name
	this.points = points
}

$(document).ready(initializeApp)

function initializeApp() {

	applyClickHandlers()
	updateSavedSpecs()


	var refresh = (performance.navigation.type == 1) ? true : false
	let reset = false
	let myURL = new URL(document.location)
	let className
	if (myURL.search) {
		let params = myURL.searchParams
		if (params.has('class')) {
			let findClass = params.get('class')
			if (CLASS_ARR.some(function (name) { return findClass == name })) {
				className = params.get('class')
				if (myURL.hash == '') {
					reset = true
				} else {
					reset = false
				}
			} else {
				reset = true
			}
		}
	} else {
		reset = true

	}
	reset = (refresh) ? true : reset

	buildClassData(null, className, myURL.hash, reset)

}

function applyClickHandlers() {
	classSelectionHandler()
	talentHandler()
	exportSpec()
	resetHandler()
	lockSpec()
	resetTree()
	getSpecName()
	saveSpec()
	sideNav()
	specNameValidator()
	preventInspect()
}

function preventInspect(){
	$('#talentCalc').on({
		contextmenu: e => {
			e.preventDefault()
			return false
		},
	})
}

function exportSpec() {
	$("#export").on({
		click: e => {
			e.preventDefault()
			e.stopImmediatePropagation()
			if (!$("#talentLock").hasClass('lock')) {
				$("#talentLock").trigger("click")
			}
			let url = new URL(document.location)
			$('#export').popover({
				content: url.toString(),
				title: "Copied!",
				container: "#export",
				template: '<div class="popover customPopover bg-dark text-white" role="tooltip"><div class="arrow text-white"></div><h3 class="popover-header bg-dark text-white"></h3><div class="popover-body bg-dark text-white"></div></div>'
			})

			// not all browsers support navigator.clipboard.writeText()
			navigator.clipboard.writeText(url.toString()).then(function () {
				/* clipboard successfully set */
			}, function () {
				/* clipboard write failed */
				let tempInput = document.createElement("input")
				tempInput.style = "position: absolute; left: -1000px; top: -1000px"
				tempInput.value = url.toString()
				document.body.appendChild(tempInput)
				tempInput.select()
				document.execCommand("copy")
				document.body.removeChild(tempInput)
			});

			$('#export').popover('toggle')
		},

		'shown.bs.popover': e => {
			setTimeout(function a() {
				$('#export').popover('hide')
				$('#export').popover('disable')
			}, 1500)

		},
		'hidden.bs.popover': e => {
			$('#export').popover('enable')
		},
	})
}

function resetTree() {
	$('.resetTree').on({
		click: e => {
			e.preventDefault()
			let treeName = $(e.target)[0].id
			resetTalentTree(treeName.slice(5, treeName.length), e)
		}
	})
}

function specNameValidator(){
	$("#specName").on({
		keyup: e=> {
			const validNameRE = /^([\w. -]{2,18})$/
			let proposedSpecName = ($("#specName").val()).trim()

			let matched = proposedSpecName.match(validNameRE)

			if (!matched) {
				$("#specNameValidation").addClass('invalid-feedback')
				$("#specNameValidation").text('Spec name must be 2-18 characters (a-Z 0-9 -._ )')
				$("#confirmSpecName").addClass('disabled')
				$("#saveSpec").unbind("submit")
				$("#saveSpec").bind("submit", function(e) {
					e.preventDefault()
					return false
				})
			} else {
				$("#specNameValidation").text('')
				$("#confirmSpecName").removeClass('disabled')
				$("#saveSpec").bind("submit", saveSpec())
			}
		},
		blur: e=> {
			let proposedSpecName = ($("#specName").val()).trim()

			$("#specName").val(proposedSpecName)
		}

	})
}

function saveSpec(){
	$('#saveSpec').on({

		submit: e=> {
			e.preventDefault()
			let oldSpecs = checkForSavedSpecs()
			let specURL = document.location

			let specName = ($("#specName").val()).trim()

			if (specName) {

				let treeNames = talentPointsSpent.treeNames
				let mySpec = new TalentSpec(specURL, talentPointsSpent.className,specName.toString(), [talentPointsSpent[treeNames[0]].total(), talentPointsSpent[treeNames[1]].total(), talentPointsSpent[treeNames[2]].total()])
				let name = mySpec.name
				let newSpec = {[name.toString()]: mySpec}
				let allSpecs = Object.assign({}, oldSpecs, newSpec)

				localStorage.setItem('savedSpecs', JSON.stringify(allSpecs));
				updateSavedSpecs()
				let currentSelectedSpec = $("div.specItem.selected")

				if (!($(`div.specItem[name='${name}']`) == currentSelectedSpec)){
					currentSelectedSpec.removeClass('selected')
					$(`div.specItem[name='${name}']`).addClass('selected')
				}
				// $(`div.specItem[name='${name}']`).addClass('specSelected')
			} else {
				return false
			}
			$("#specSaverPrompt").modal('hide')

		}
	})
}

function getSpecName() {
	$('#getSpecName').on({
		click: e => {
			e.preventDefault()

			if (talentPointsSpent.grandTotal() == 0){
				alert('Unable to save empty spec')
				return false
			}
			if ($("#talentLock").hasClass('unlock')) {
				$("#talentLock").trigger("click")
			}

			let currentSelectedSpec = $("div.specItem.selected")

			if (currentSelectedSpec.length) {
				let name = currentSelectedSpec.attr('name')
				$("#specName").val(name)
				// $("#useCurrentSpec").removeClass('disabled')
			} else {
				// $("#useCurrentSpec").addClass('disabled')
			}
			$("#specSaverPrompt").modal('show')

		}
	})
}

function checkForSavedSpecs() {
	let existingSpecs = localStorage.getItem('savedSpecs');
	if (existingSpecs) {
		return JSON.parse(existingSpecs)
	}else{
		return {}
	}
}

function updateSavedSpecs() {
	$('.specList, .saveSpec').empty()

	let existingSpecs = checkForSavedSpecs()
	if (existingSpecs) {
		specList = Object.entries(existingSpecs)
		for (const [name,item] of specList) {
			let specContainer = $('<div/>', {
				class: 'specContainer',
			})
			let specInfo = $('<div/>', {
				class: `specInfo ${item.className}`,
				text: ` ${utilities.titleCase(item.className)} (${item.points[0]}/${item.points[1]}/${item.points[2]})`,
			})
			let specItem = $('<div/>', {
				class: 'specItem',
				text: item.name,
				href: item.url.href,
				name: item.name,
				wowclassname: item.className
			})
				.on('click', (e) => {
					if ($(e.target).hasClass('selected')) {
						return false
					} else {
						$('.specItem').removeClass('selected')
						$(e.target).addClass('selected')

						resetAll()

						let myURL = new URL(item.url.href)
						let params = myURL.searchParams
						let hasClass = params.has('class')
						let hash = myURL.hash

						history.replaceState(null, null, myURL)

						if (hasClass && hash) {
							let cl
							let findClass = params.get('class')

							if (CLASS_ARR.some(function (x) { return findClass == x })) {
								cl = params.get('class')
							}
							talentPointsSpent = {}
							classData = {}

							buildClassData(null, cl, myURL.hash, false)
						}
					}
				})

				let deleteBtn = $('<a/>', {
					class: "btn btn-sm float-right trashcan",
					title: "Delete",
				}).on('click', function () {
					removeSavedSpec(name, existingSpecs)
				})

				deleteBtn.append($('<span/>', {
					class: "glyphicon glyphicon-trash glyphicon-custom",
					style: "color: azure;"
				}))
				specItem.append(deleteBtn)
				// .prepend($('<button/>', {
				// 	class: 'delete',
				// 	title: 'Delete'
				// }).on('click', ()=>{
				// 	removeSavedSpec(name, existingSpecs)
				// }))
				specContainer.append(specInfo, specItem)
			$('.specList').append(specContainer)
		}
	} else {
		localStorage.remove('savedSpecs')
	}

	let checkIfEmpty = $('.specList').children()
	if (checkIfEmpty.length === 0){
		$('.specList').text("To save a spec, fill out your talents then click the save icon (top right of calculator). We use cookies to save your specs on this page, so aslong as you don't clear cookies on us, your specs will be here forever!")
	}
}

function removeSavedSpec(name, existingSpecs) {
	delete existingSpecs[name]
	localStorage.setItem('savedSpecs', JSON.stringify(existingSpecs));
	updateSavedSpecs()
}

function sideNav(){
	sideNav = $('.savedSpecs')
	navTrigger = $('.side-nav-trigger')
	icon = $('.trigger-icon')
	navTrigger.on({
		click: e => {
			if(sideNav.hasClass('minimized')){
				sideNav.removeClass('minimized')
				icon.removeClass('iconSwitch')
			}else{
				sideNav.addClass('minimized')
				icon.addClass('iconSwitch')
			}
		},
	})
}

function handlebarsPopulateTables(reset = false) {
	//Retrieve the template data from the HTML
	let template = $('#talentTree-block-template').html();
	//Compile the template data into a function
	let templateScript = Handlebars.compile(template);
	let talent_html = templateScript(classData);
	$('#talentCalc').html(talent_html);
	talentHandler()
	if (!reset) {
		resetHandler()
	}
	resetTree()
}



function classSelectionHandler() {
	$('.class-filter').on({
		click: e => {
			let cl
			if ($('.class-filter.selected') == $(e.target)) {
				console.log('selected: ', $('.class-filter.selected'))
				console.log('target: ', $(e.target))
				return false
			}
			else {
				cl = $(e.target)[0].id
			}
			buildClassData(e, cl, '', true)
			let selectedSpec = $('div.specItem.selected')
			if (selectedSpec){
				let savedSpecClassText = selectedSpec.text()
				let matched = savedSpecClassText.match(re3)
				if (matched){
					let className = matched[1]

					if (!(className == talentPointsSpent.className)){
						selectedSpec.removeClass('selected')
					}
				}
				let specURL = selectedSpec.attr('href')
				let currentURL = document.location
				if(currentURL != specURL){
					selectedSpec.removeClass('selected')
				}
			}

		},
	})
}

function lockSpec() {
	$('#talentLock').on({
		click: e => {

			let url = new URL(document.location)
			let lockButton = $("#talentLock")
			let params = url.searchParams

			if ($("#talentLock").hasClass('lock')) {
				talentPointsSpent.hardLocked = false
				talentUnlocker()

				lockButton.removeClass("lock").addClass("unlock")
				lockButton.attr('title', 'Unlocked')

				params.delete('L')

				if (talentPointsSpent.softLocked) {
					talentLocker()
				}
			}
			else if ($("#talentLock").hasClass('unlock')) {
				talentLocker()

				talentPointsSpent.hardLocked = true

				lockButton.removeClass("unlock").addClass("lock")
				lockButton.attr('title', 'Locked')
				params.set('L', true)
			}
			history.replaceState({}, null, url)

		},
	})
}

function resetHandler() {
	$('#resetTalents').on({
		click: e => {
			resetAll()
			$("#talentLock").unbind("click")
			$("#talentLock").bind("click", lockSpec())
		}
	})
}

function resetAll() {

	console.log('reset all')
	let className = $('.class-filter.selected')[0].id
	let treeNames = talentPointsSpent.treeNames

	talentPointsSpent.hardLocked = false
	talentPointsSpent.softLocked = false

	treeNames.forEach(function (tree) {
		resetTalentTree(tree)
	})

	if ($("#talentLock").hasClass('lock')) {
		$("#talentLock").trigger("click")
	}

	let url = new URL(document.location)
	url.hash = '#'
	history.replaceState(null, null, url)
}

function resetTalentTree(tree, e) {

	let found = classData.trees.find(function (x) {
		return x.name == tree
	})

	found.data.forEach(function (dataArr, tier) {
		dataArr.forEach(function (tal) {
			if (tal) {
				tal.invested = 0
				let targetTalent = $(`img.talent[name="${tal.name}"]`)
				targetTalent.removeClass('max')
				let spentPoints = targetTalent.closest('.talent-slot').find('.spentPoints')
				spentPoints.text(tal.invested).removeClass('max')
			}
		})
	})

	talentPointsSpent[tree].vals.forEach(function (v, i) {
		talentPointsSpent[tree].vals[i] = 0
	})

	if (talentPointsSpent.grandTotal() < 51) {
		talentPointsSpent.softLocked = false
	}

	updateTalentHeader()

	let footer = ''

	if (e) {
		let targetTalent = $(e.target)
		footer = targetTalent.parents(".talentFooter").find("span.talentFooter-spentPoints")
		footer.first().text("(" + talentPointsSpent[tree].total() + ")")
	} else {

		let targetTalent = $(`span:contains('${tree}')`)
		footer = targetTalent.parents(".talentFooter").find("span.talentFooter-spentPoints")
		footer.first().text("(" + talentPointsSpent[tree].total() + ")")

	}

	talentLocker(tree)
	talentUnlocker(tree)

	if ((talentPointsSpent.hardLocked) || (talentPointsSpent.softLocked)) {
		talentLocker()
	} else {
		talentUnlocker()
	}
}

function buildClassData(e = null, cl = 'warrior', hash = '', reset = false) {
	console.log('building class data')
	let className = cl
	let url = new URL(document.location)
	let params = url.searchParams
	classData = {}
	talentPointsSpent = {}


	if (cl) {
		$('.class-filter').removeClass('selected')
		$(`#${className}`).addClass('selected')
		params.set('class', className)
		history.replaceState(null, className, url)
	}
	else {
		$('.class-filter').removeClass('selected')
		const clickedFilter = $(e.target)

		clickedFilter.addClass('selected')
		className = clickedFilter[0].id

		params.set('class', className)
		params.delete('L')
		url.hash = '#'
		history.replaceState(null, className, url)
	}

	// applySelectionMarker()

	const selectedClass = talentData.classes.find(function (a) {
		return a.name == className;
	})

	let treeNames = []

	selectedClass.tree_talents.forEach(function (item, index) {
		treeNames.push(item.name)
		talentPointsSpent[item.name] = {
			vals: [0, 0, 0, 0, 0, 0, 0],
			total: function () { return this.vals.reduce((a, b) => a + b) },
			highest_tier: function () {
				let x = []
				this.vals.forEach(function (item, index) {
					if (item > 0) {
						x.push(index)
					}
				})
				return Math.max(...x) + 1
			}
		}
	})
	talentPointsSpent.grandTotal = function () {
		return (this[treeNames[0]].total() + this[treeNames[1]].total() + this[treeNames[2]].total())
	}

	// for convenience
	talentPointsSpent.treeNames = treeNames
	talentPointsSpent.className = className

	talentPointsSpent.hardLocked = false
	talentPointsSpent.softLocked = false


	const tableData = tableFormat[className]
	const combinedTalents = combineTalents(selectedClass)
	const finalData = mapTalentsToTableData(tableData.trees, combinedTalents)

	classData = { trees: finalData }

	handlebarsPopulateTables(reset)

	if (reset) {
		resetAll()
	} else if (hash && !reset) {
		const expanded = urlExpander(hash)
		try {
			preBuiltSpec(expanded)
			if (params.has('L')) {

				if (!$("#talentLock").hasClass('lock')) {
					$("#talentLock").trigger("click")
				}
			}
		} catch (error) {
			console.log("While building spec using hash, the following exception occurred:\n", error)
		}
	} else {
		talentLocker()
	}

	updateTalentHeader() //function call needed here for switching to different class
}

function mapTalentsToTableData(trees, tal_arr) {
	trees.forEach(function (tree, index) {
		tree.data.forEach(function (data_arr, j) {
			let reqTalentPoints = j * 5
			data_arr.forEach(function (v, k) {
				if (v >= 1 || v.length > 1) { //
					trees[index].data[j][k] = tal_arr.pop()
					trees[index].data[j][k].invested = 0
					trees[index].data[j][k].requiredTalentPoints = reqTalentPoints
					trees[index].data[j][k].j = j
					trees[index].data[j][k].k = k
					if (trees[index].data[j][k].unlocks) {
						trees[index].data[j][k].arrows = []
						if (v.length == 2) {
							trees[index].data[j][k].multi = true
							trees[index].data[j][k].unlocks.forEach(function (z, ii) {
								trees[index].data[j][k].arrows.push(arrowTypeSwitch(v[ii]))
							})
						}
						else {
							trees[index].data[j][k].arrows.push(arrowTypeSwitch(v))
						}
					}
				}
			})
		})
	})
	return trees
}

function arrowTypeSwitch(item) {

	switch (item) {
		// down, arrow length is inverse of v (v decreases, length increases)
		default:
			let n = 5 - item
			return `talentcalc-arrow-down down-${n}`
		// right
		case 6:
			return "talentcalc-arrow right"
		// rightdown
		case 7:
			return "talentcalc-arrow rightdown"
	}
}

function combineTalents(d) {
	let talent_arr = []
	data = d.tree_talents
	data.forEach(function (item, index) {
		talent_arr.push(item.talents)
	})
	return talent_arr.flat().reverse()
}

function talentHandler() {

	$(".talent").on({
		contextmenu: e => {
			e.preventDefault()
		},

		mouseenter: e => {
			updateTooltip(e)
		},

		mouseleave: e => {
			$("#tooltip").hide()
			$("#tooltip").children().remove()
		},

		mousedown: e => {
			mouseDownHandler(e)
		},

	})
}

function mouseDownHandler(e = null, talent, tree) {
	var manuallyClicked = false
	if (e) {
		manuallyClicked = true
		var targetTalent = $(e.target)

		$("#tooltip").hide()
		$("#tooltip").children().remove()

		var treeName = targetTalent.closest('div.talentTable')[0].id

		const name = targetTalent.attr('name')
		const j = targetTalent.attr('data-j')
		const k = targetTalent.attr('data-k')

		const found = classData.trees.find(function (x) { //
			return x.name == treeName
		})
		var talentObj = found.data[j][k]

		talentObj.invested = parseInt(targetTalent.closest('.talent-container').find('.spentPoints').first().text()) // should insure points don't carry over when switching between classes

		if (((talentObj.invested === talentObj.maxRank) && e.which === 1) || (talentPointsSpent.hardLocked)) {
			updateTooltip(e) //tooltip goes away otherwise, unsure why
			return
		}
	}
	else {
		var talentObj = talent
		var treeName = tree
		var targetTalent = $(`img.talent[name="${talentObj.name}"]`)
		var e = true
	}
	pointSpender(talentObj, e, treeName)

	targetTalent.closest(".talentTable").find(".talentFooter span.talentFooter-spentPoints").text("(" + talentPointsSpent[treeName].total() + ")")

	if (manuallyClicked) {
		urlBuilder()
		updateTooltip(e)
	}

	updateTalentHeader()
}

function updateTalentHeader() {
	let treeNames = talentPointsSpent.treeNames

	let a = `(${talentPointsSpent[treeNames[0]].total()}/${talentPointsSpent[treeNames[1]].total()}/${talentPointsSpent[treeNames[2]].total()})`
	$("#allottedTalentPoints").text(a)
	let requiredLevel = (talentPointsSpent.grandTotal() >= 1) ? talentPointsSpent.grandTotal() + 9 : "--"
	$("#requiredLevel").text(`Required level: ${requiredLevel}`)
	let pointsRemaining = 51 - talentPointsSpent.grandTotal()
	$("#pointsRemaining").text(`Points left: ${pointsRemaining}`)
}

function updateTooltip(e) {
	const targetTalent = $(e.target)
	const name = targetTalent.attr('name')
	const tree = targetTalent.closest('div.talentTable')[0].id

	const found = classData.trees.find(function (x) {
		return x.name == tree
	})

	const j = targetTalent.attr('data-j')
	const k = targetTalent.attr('data-k')

	const talentObj = found.data[j][k]
	const talentCopy = Object.assign({}, talentObj)
	const requiredTalentPoints = talentObj.requiredTalentPoints

	let description
	let next_rank = true
	let req_text = ''
	let tooltipFooter = {}

	const locked = $(e.target).hasClass('locked')

	if (talentObj.invested == 0) {
		next_rank = false
		talentCopy.invested++
		tooltipFooter.text = 'Click to learn'
		tooltipFooter.color = 'learn'
		description = talentCopy.description()
	}

	if (talentObj.maxRank == 1) {
		next_rank = false
		talentCopy.invested = talentCopy.maxRank
		description = talentCopy.description()
	}

	if (talentObj.invested == talentObj.maxRank) {
		tooltipFooter.text = 'Right-click to unlearn'
		tooltipFooter.color = 'unlearn'

		next_rank = false
		description = talentCopy.description()
	}

	if (talentObj.maxRank > 1 && talentObj.invested > 0 && next_rank) {
		talentCopy.invested++
		// description = talent.description() + "\n\nNext Rank:\n" + talentCopy.description()
		description = talentObj.description()

	}
	if (talentPointsSpent[tree].total() < requiredTalentPoints) {
		req_text = `Requires ${requiredTalentPoints} points in ${tree} Talents`
	}

	if (locked) {
		const coords = talentCopy.locked
		const prereq = Object.assign({}, found.data[coords[0]][coords[1]])
		const points_remaining = prereq.maxRank - prereq.invested
		const plural = (points_remaining > 1) ? 's' : ''
		req_text = `Requires ${points_remaining} point${plural} in ${prereq.name}\n` + req_text  //Figure out how to get the talent and points needed to unlock for this text
	}


	const tooltipElems = [
		{class: 'title', text: name},
		{class: 'rank', text: "Rank " + talentObj.invested + "/" + talentObj.maxRank},
		{class: 'req', text: req_text},
		{class: 'description', text: description} ]

	if (next_rank) {
		tooltipElems.push({class: 'next', text: "\nNext Rank:\n"})
		tooltipElems.push({class: 'description', text: talentCopy.description()})

	} else if (!(req_text || talentPointsSpent.hardLocked || (talentPointsSpent.softLocked && tooltipFooter.color == 'learn'))) {
		tooltipElems.push({class: tooltipFooter.color, text: tooltipFooter.text})
	}

	utilities.bigdaddytooltip(targetTalent, tooltipElems)

}

function checkIfAbleToUnspec(tree, tier_unspeccing_from) {

	const tier_unspeccing = tier_unspeccing_from
	const tier_check = talentPointsSpent[tree].highest_tier() - 1
	const locked_tier = checkLockedTiers(tree)
	const tier_unlocked = (tier_unspeccing <= locked_tier) ? false : true

	let decision = false
	if (!tier_unlocked) {
	}

	if (((talentPointsSpent[tree].vals.slice(0, tier_check).reduce((a, b) => (a + b)) - tier_check * 5) > 0) &&
		tier_unlocked &&
		(talentPointsSpent[tree].vals.slice(0, tier_unspeccing).reduce((a, b) => (a + b)) - tier_unspeccing * 5) > 0) {
		decision = true
	}
	return decision
}

function checkLockedTiers(tree) {
	let bool_arr = [], num_arr = []
	let tier_check = talentPointsSpent[tree].highest_tier() - 1

	for (let k = 0; k < tier_check; k++) {

		let y = k + 1
		let req_points = y * 5
		let f = talentPointsSpent[tree].vals.slice(0, y).reduce((a, b) => (a + b))
		let sum = (f - req_points)
		num_arr.push(sum)
		bool_arr.push({ extrapoints: sum, tier: y }) //for debugging
	}

	let locked_tier = num_arr.lastIndexOf(0) + 1
	return locked_tier
}

function pointSpender(talent, e, tree, targetTal) {

	const unlocks = (!Array.isArray(talent.unlocks)) ? Array(talent.unlocks) : talent.unlocks
	const tier = (talent.requiredTalentPoints / 5)
	const targetTalent = $(`img.talent[name="${talent.name}"]`)

	if ((talentPointsSpent[tree].total() < talent.requiredTalentPoints) || (targetTalent.hasClass('locked')) || (talentPointsSpent.hardLocked)) {
		return
	}


	// normal click
	if (e.which === 1 || e == true) {
		if (talentPointsSpent.grandTotal() > 50) {
			if (!talentPointsSpent.softLocked) {
				talentPointsSpent.softLocked = true
				talentLocker()
			}
			return
		}
		if (talent.invested < talent.maxRank) {
			talentPointsSpent[tree].vals[tier]++
			talent.invested++

			targetTalent.closest('.talent-container').find('.spentPoints').first().text(talent.invested)

			let tierU = (talentPointsSpent[tree].total() < 30) ? Math.floor(talentPointsSpent[tree].total() / 5) : 6
			let talentObjs = []
			const found = classData.trees.find(function (x) {
				return x.name == tree
			})

			found.data[tierU].filter(function (t) {
				if (t) {
					talentObjs.push(t)
				}
			})

			talentObjs.forEach(function (tal) {
				let t = $(`img.talent[name="${tal.name}"]`)
				t.removeClass('grayed') // ungray talent element
				t.closest('.talent-container').find(".spentPoints").first().removeClass('grayed') // ungray spentPoints element
				if (tal.locked) { // if talent object has locked property, also has arrows
					arrowClassChanger(tal.name, false, 'grayed')
				}
			})

			if (talent.invested == talent.maxRank) {
				let t = $(`img.talent[name="${talent.name}"]`)
				t.addClass('max')
				t.closest('.talent-container').find(".spentPoints").first().addClass('max')

				// if talent is a pre req, unlock each parent elem
				if (talent.unlocks) {
					unlocks.forEach(function (n) {
						let par = $(`img.talent[name="${n}"]`).removeClass('locked') //unlock talent element
						par.closest('.talent-container').find(".spentPoints").first().removeClass('locked') //unlock points spent element
						arrowClassChanger(n, false, 'locked')

					})
				}
			}
			if (talentPointsSpent.grandTotal() > 50) {
				talentPointsSpent.softLocked = true
				talentLocker()
				return
			}
			return
		}
	}

	// right click
	else if (e.which === 3) {
		let can_unspec = false
		let tier_unspeccing = tier + 1
		if (tier_unspeccing == talentPointsSpent[tree].highest_tier()) {
			can_unspec = true
		}

		if (tier_unspeccing < talentPointsSpent[tree].highest_tier()) {
			can_unspec = checkIfAbleToUnspec(tree, tier_unspeccing)
		}

		if (talent.invested == talent.maxRank && unlocks) {
			// NOTE: will be unique once element names are unique, won't need .first()
			let test_arr = []
			unlocks.forEach(function (item) {
				const child_talent = $(`img.talent[name="${item}"]`)
				let n = child_talent.closest('.talent-container').find('.spentPoints').text()
				if (can_unspec && n > 0) {
					console.log('you must unspec ' + item)
					test_arr.push(false)
					return
				}
				else {
					test_arr.push(true)
				}
			})
			if (test_arr.some(function (item) { return item == false })) {
				return
			}
		}


		if (talent.invested > 0 && can_unspec) {
			talentPointsSpent[tree].vals[tier]--
			talent.invested--

			targetTalent.closest('.talent-container').find('.spentPoints').first().text(talent.invested)


			if (talentPointsSpent.grandTotal() < 51 && talentPointsSpent.softLocked) {
				talentPointsSpent.softLocked = false
				talentUnlocker()
			}

			// begin locking/graying syntax
			talElem = $(`img.talent[name="${talent.name}"]`)
			talElem.removeClass('max') //NOTE: remove max class from talent element
			talElem.closest('.talent-container').find('.spentPoints').removeClass('max') // NOTE: remove max class from pointsSpent element
			if (talent.unlocks) {
				unlocks.forEach(function (n) {
					let par = $(`img.talent[name="${n}"]`).addClass('locked') //NOTE: locks talent element
					par.closest('.talent-container').find(".spentPoints").first().addClass('locked') //NOTE: locks points spent element

					arrowClassChanger(n, true, 'locked')
				})
			}

			let tierL = Math.floor(talentPointsSpent[tree].total() / 5) + 1

			let talentObjs = []

			let found = classData.trees.find(function (x) {
				return x.name == tree
			})

			found.data.slice(tierL).forEach(function (arr, ind) {
				arr.filter(function (t) {
					if (t) {
						talentObjs.push(t)
					}
				})
			})

			talentObjs.forEach(function (tal, ind) {
				if (tal) {
					let t = $(`img.talent[name="${tal.name}"]`)
					t.addClass('grayed') //NOTE: grayed added to talent elem
					t.closest('.talent-container').find('.spentPoints').addClass('grayed') //NOTE: grayed added to pointsSpent elem
					if (tal.locked) {
						arrowClassChanger(tal.name, true, 'grayed')
					}
				}
			})
			return
		}
	}
}

// needs optimization
function talentLocker(tree = '') {

	// console.log('\nlocking\n')
	let treeNames = []
	if (!tree) { // defaults to all trees
		treeNames = talentPointsSpent.treeNames
	} else {
		treeNames.push(tree)
	}
	let talentObjs = []

	// get list of talent objects with no points spent
	treeNames.forEach(function (name) {
		let found = classData.trees.find(function (x) {
			return x.name == name
		})

		found.data.forEach(function (dataArr, tier) {
			dataArr.forEach(function (tal) {
				if (tal) {
					if (!tal.invested) {
						talentObjs.push(tal)
					}
				}
			})
		})
	})

	talentObjs.forEach(function (tal) {
		let t = $(`img.talent[name="${tal.name}"]`)
		t.addClass('grayed')
		t.closest('.talent-slot').find(".spentPoints").addClass('grayed')
		if (tal.locked) {
			arrowClassChanger(tal.name, true, 'grayed')
		}
		if (tal.unlocks) {
			let unlocks = (!Array.isArray(tal.unlocks)) ? Array(tal.unlocks) : tal.unlocks
			unlocks.forEach(function (n) {
				let par = $(`img.talent[name="${n}"]`).addClass('locked')
				par.closest('.talent-container').find(".spentPoints").first().addClass('locked')

				arrowClassChanger(n, true, 'locked')
			})
		}
	})
}

function talentUnlocker(tree = '') {
	let treeNames = []
	if (!tree) { // defaults to all trees
		treeNames = talentPointsSpent.treeNames
	} else {
		treeNames.push(tree)
	}

	treeNames.forEach(function (tree) {
		let found = classData.trees.find(function (x) {
			return x.name == tree
		})
		let y = (talentPointsSpent[tree].total() < 30) ? Math.floor(talentPointsSpent[tree].total() / 5) : 6
		let tiers = [...Array(y + 1).keys()]
		tiers.forEach(function (i) {
		})
		let tier = tiers[tiers.length - 1]
		for (tier; tier >= 0; tier = tier - 1) {
			found.data[tier].forEach(function (tal) {
				if (tal) {//skips empty slots
					let t = $(`img.talent[name="${tal.name}"]`)
					t.removeClass('grayed')
					t.closest('.talent-slot').find('.spentPoints').first().removeClass('grayed')
					if (tal.locked) {
						arrowClassChanger(tal.name, false, 'grayed')

					}

				}
			})
		}
	})
}

function urlBuilder() {

	let myURL = ''
	var newURL = ''
	classData.trees.forEach(function (item, ind) {
		let invested = ''
		item.data.forEach(function (dataArr) {
			dataArr.forEach(function (x) {
				if (x) {
					invested = invested.concat('', x.invested)
				}
			})
		})
		invested = (!invested.length % 2 == 0) ? invested.concat('', '0') : invested
		invested = (ind < 2) ? invested.concat('', '7') : invested.concat('', '8')
		myURL = myURL.concat('', invested)
	})

	let newStrArr = myURL.split('7')
	newStrArr.forEach(function (str, indc) {

		if (indc < 2) {
			str = (str.length % 2 == 0) ? str.concat('', '07') : str.concat('', '7')
		}
		for (var i = 0; i < str.length; i = i + 2) {
			let subStr = str.substring(i, i + 2)
			newURL = newURL.concat('', translationTable[parseInt(subStr)])
		}
	})

	let matchArr = newURL.match(re)
	for (var y = 0; y < matchArr.length; y++) {
		newURL = newURL.replace(matchArr[y], matchArr[y][0] + (matchArr[y].length).toString())
	}

	let shortestURL = newURL.slice(0, newURL.indexOf('Z'))
	let url = new URL(location.origin + location.pathname)
	let params = url.searchParams

	params.set('class', $('.class-filter.selected')[0].id)
	url.hash = shortestURL
	// const finalURL = new URL(hash, url);
	history.replaceState(null, null, url)
	return shortestURL
}

function urlExpander(hash) {

	if (!hash) {
		var hash = window.location.hash
	}
	let newStr = hash.slice(hash.indexOf('#') + 1, hash.length)
	let matchArr = newStr.match(re2)
	for (var y = 0; y < matchArr.length; y++) {
		let replStr = Array(parseInt(matchArr[y][1])).fill(matchArr[y][0]).join('')
		newStr = newStr.replace(matchArr[y], replStr)
	}
	let newStrArr = newStr.split('Y')
	let arr

	newStrArr.forEach(function (item, ind) {
		item = (ind < 2) ? item + 'Y' : item + 'Z'
		arr = item.split('')
		arr.forEach(function (v, i) {
			arr[i] = arr[i].replace(v, reversedTable[v])
		})
		newStrArr[ind] = arr.join('')

	})
	newStr = newStrArr.join('')
	return newStr

}

// needs new name
function preBuiltSpec(hash = '') {

	var treeName = ''
	let hashArr = hash.slice(0, hash.indexOf('8')).split('7')
	classData.trees.forEach(function (item, i) {
		var arr = hashArr[i].split('')
		treeName = item.name
		item.data.forEach(function (dataArr, i2) {
			dataArr.forEach(function (t, i3) {
				if (t) {
					if (hashArr) {
						if (arr[0] > 1) {
							let newArr = [...Array(parseInt(arr.shift()))].fill()
							newArr.forEach(function (item2) {
								mouseDownHandler(null, t, treeName)
							})
							return
						} if (arr[0] == 1) {
							arr.shift()
							mouseDownHandler(null, t, treeName)
							return

						} else {
							arr.shift()
						}
					}
				}
			})
		})
	})
}

function arrowClassChanger(talName, add, lockOrGray) {
	//

	let addOrRemove = 'add'

	if (!add) {
		addOrRemove = 'remove'
	}
	let arrows = $(`div.talentcalc-arrow[data-unlocks="${talName}"]`)
	arrows.each(function () {
		if (add) {
			$(this).addClass(lockOrGray)
		} else {
			$(this).removeClass(lockOrGray)
		}
	})
}

function updateURL(url) {
	history.replaceState(null, null, url)
}
