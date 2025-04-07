// ==UserScript==
// @name		ElethorSpireAnchorPointCodedCopier
// @namespace	https://github.com/Sarusei
// @version		0.1
// @description	Copies anchor point data as coded values into the clipboard, to be used in a google sheet
// @author		Sarusei
// @ingame		https://elethor.com/profile/51368
// @match		https://elethor.com/fight/spire
// @license		GPL-3.0-or-later
// @updateURL	https://raw.githubusercontent.com/Sarusei/ElethorSpireAnchorPointCodedCopier/master/ElethorSpireAnchorPointCodedCopier.user.js
// @downloadURL	https://raw.githubusercontent.com/Sarusei/ElethorSpireAnchorPointCodedCopier/master/ElethorSpireAnchorPointCodedCopier.user.js
// @grant		GM_addStyle
// ==/UserScript==


(function() {
	'use strict';
	
	// variables bolow can be changed to customize the script
	let SHOW_POPUP = false;			// Set to true if you want a text box popup instead of an alert
	let NO_NOTIFICATION = false;	// Set to true if you want to disable the alert notification
	
	// do not change anything below this line
	/********************************************
	 * 1) DEFINE THE DICTIONARY AND HELPERS
	 ********************************************/
	const statDictionary = {
		// Offense
		1:  "Base Damage",
		2:  "Increased Damage",
		3:  "Base Damage Minus Health",
		4:  "Base Crit",
		5:  "Increased Crit",
		6:  "Base Crit Chance",
		7:  "Base Breach",
		8:  "Increased Breach",
		9:  "Base Breach Minus Barrier",
		
		// Defense
		11: "Base Health",
		12: "Increased Health",
		13: "Base Health Minus Damage",
		14: "Base Block",
		15: "Increased Block",
		16: "Base Block Chance",
		17: "Base Barrier",
		18: "Increased Barrier",
		19: "Base Barrier Minus Breach",
		
		// Utility
		21: "U1",
		22: "U2",
		23: "U3",
		24: "U4",
		25: "U5",
		26: "U6",
		27: "U7",
		28: "U8",
		29: "U9",
	};
	
	const reverseDictionary = Object.entries(statDictionary)
		.reduce((obj, [id, statName]) => {
			obj[statName] = Number(id);
			return obj;
		}, {});
	// Now reverseDictionary["Base Damage"] === 1, etc.
	
	/**
	 * Extract the numeric portion from a heading like:
	 *	"5.78% Increased Crit"
	 *	"10.07% Increased Barrier"
	 *	"33.02 Base Block"
	 *	"42.43 Base Health"  etc.
	 *
	 * Returns { keyStr, numericValue } or null if not found.
	 */
	function parseHeadingText(fullText) {
		// 1) Extract the numeric portion (like 5.78)
		//    capture the first float:
		const floatMatch = fullText.match(/([\d.]+)\s*(%?)/);
		if (!floatMatch) return null;
		
		const numericValue = floatMatch[1];  // e.g. "5.78"
		
		// 2) Extract the text that indicates the dictionary key:
		//    remove the numeric portion from the front, then trim
		const leftoverText = fullText.replace(floatMatch[0], '').trim();
		// leftoverText might be "Increased Crit", "Base Barrier", etc.
		
		return {
			keyStr: leftoverText,
			numericValue: numericValue
		};
	}
	
	/**
	 * Given a stat name like "Increased Crit" (exact match),
	 * return the numeric dictionary code (e.g. 5).
	 * If not found, return null.
	 */
	function findDictionaryCode(keyStr) {
		// Loop over numeric IDs (like 1, 2, 3...) in statDictionary
		for (let numericId in statDictionary) {
			if (statDictionary[numericId] === keyStr) {
				// Return the ID as a number
				return parseInt(numericId, 10);
			}
		}
		return null; 
	}
	
	function findDictionaryCodeExact(keyStr) {
		return reverseDictionary[keyStr] ?? null;
	}
	
	function findDictionaryCodeSubstring(keyStr) {
		for (let label in reverseDictionary) {
			if (keyStr.includes(label)) {
				return reverseDictionary[label];
			}
		}
		return null;
	}
	
	/********************************************
	 * 2) BUILD THE BUTTON + EVENT
	 ********************************************/
	
	const copyButton = document.createElement('button');
	copyButton.textContent = 'Copy Coded Data';
	copyButton.style.cssText = `
		cursor: pointer;
		padding: 0.3em 0.6em;
		background: #0d6efd; /* a bluish background */
		color: white;
		border: none;
		border-radius: 4px;
		margin-left: 1em;
	`;
	
	let purchasedButton = null;
	
	// Wait for the page to load or for the element to appear
	window.addEventListener('load', function() {
		purchasedButton = document.querySelector('button.button.is-small.is-success');
		
		if (!purchasedButton) {
			console.log('[Tampermonkey] Could not find the "Show Only Purchased" button.');
			return;
		}
		
		purchasedButton.parentNode.appendChild(copyButton);
		
		// 4) (Optional) Add a click handler on your new button
		copyButton.addEventListener('click', function() {
			alert('run your copy logic!');
		});
	}, false);
	
	
	// if (false) {
	if (purchasedButton) {
		// On click => parse, build code, copy
		copyButton.addEventListener('click', () => {
			const resultLines = [];
			
			const anchorPointBlocks = document.querySelectorAll('div:has(> .flex.h-8 p.text-lg)');
			
			anchorPointBlocks.forEach((anchorDiv) => {
				// Find the anchor's label, e.g. "ANCHOR POINT A1"
				const anchorHeading = anchorDiv.querySelector('.flex.h-8 p.text-lg');
				const anchorName = anchorHeading ? anchorHeading.textContent.trim() : 'Unknown';
				
				const cards = anchorDiv.querySelectorAll('.card');
				
				const codeArray = [];
				const valueArray = [];
				
				cards.forEach((c) => {
					const heading = c.querySelector('h5');
					if (!heading) return;
					
					const headingText = heading.innerText || heading.textContent;
					const parsed = parseHeadingText(headingText);
					if (!parsed) return;
					
					// Next find if leftover text matches dictionary
					const foundCode = findDictionaryCodeExact(parsed.keyStr);
					if (foundCode !== null) {
						codeArray.push(foundCode);
						valueArray.push(parsed.numericValue);
					}
				});
				
				if (codeArray.length > 0) {
					const codeStr  = codeArray.join(';');
					const valueStr = valueArray.join(';');
					const finalLine = `${anchorName}: ${codeStr};${valueStr}`;
					
					resultLines.push(finalLine);
				}
			});
			
			// Combine into one big text
			const finalOutput = resultLines.join('\n');
			
			// Copy to clipboard
			copyToClipboard(finalOutput).then(() => {
				if (SHOW_POPUP) {
					// 1) Show a popup text box with the result
					showPopupText(finalOutput);
				} else if (!NO_NOTIFICATION) {
					// 2) Or just alert the result
					alert(finalOutput);
				}
			});
		});
	}


	/********************************************
	 * 3) COPY + UI HELPERS
	 ********************************************/
	// function copyToClipboard(str) {
	// 	return navigator.clipboard.writeText(str).catch((err) => {
	// 		console.error('Failed to copy:', err);
	// 	});
	// }
	async function copyToClipboard(str) {
		try {
			return await navigator.clipboard.writeText(str);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	}
	
	/**
	 * If you want an optional text box popup:
	 */
	function showPopupText(textToShow) {
		// Basic styling
		const popup = document.createElement('div');
		popup.style.cssText = `
			position:fixed; z-index:9999; top:20px; left:20px;
			background:white; color:black; padding:1em; border:2px solid #888;
			box-shadow:0 0 10px rgba(0,0,0,0.3); max-width: 90vw; max-height: 90vh; overflow:auto;
		`;
		
		// Add a close button
		const closeBtn = document.createElement('button');
		closeBtn.textContent = 'Close';
		closeBtn.style.cssText = `
			float:right; margin-left:1em; background: #d33; color:#fff;
			border:none; padding:0.2em 0.6em; cursor:pointer;
		`;
		closeBtn.addEventListener('click', () => popup.remove());
		
		// Text area for the result
		const textArea = document.createElement('textarea');
		textArea.style.cssText = 'width:100%; height:200px;';
		textArea.value = textToShow;
		
		popup.appendChild(closeBtn);
		popup.appendChild(document.createElement('br'));
		popup.appendChild(textArea);
		
		document.body.appendChild(popup);
	}

})();
