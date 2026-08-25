/*
05-01-2017
Author - Anshul Kumar
Plugin to validate the pin entered by a DigitRx user. The pin is broken down into 4 individual numbers and the user enters 1 number in each input box. The data entry is automated as in the user is automatically taken to the next input box once he has entered something in the current input. Backspace and arrow keys work as well. Callback functionalities have also been provided in the plugin.

This plugin checks if all four input boxes have been filled, and then concatenates the data in all the input boxes. Once all four input boxes are filled, we can use callback functionalities present in the plugin to make an AJAX call to the database to check if the pin matches or not.


============Basic Initialization============
Wrap your html in a wrapper and pass the wrapper's class or ID in the plugin call. Let's assume our wrapper has the class 'pin-wrapper'

$('.pin-wrapper').validatePin();


============Options============
1) numericKeyboardOnMobile - If set true, it will prompt mobile devices to open numeric keyboard

    $('.pin-wrapper').validatePin({
        numericKeyboardOnMobile: true,
    });

2) blurOnSuccess - If set true, it will remove focus from the input fields on success

    $('.pin-wrapper').validatePin({
            blurOnSuccess: true,
    });


============Callback functions============
This plugin's purpose is to validate the pin entered by the user and return if the operation was successful or a failure(if all the 4 input boxes have been filled or not). 
Checking the pin by ajax and showing appropriate responses is out of the scope of the plugin and need to be written separately
Two callback functions are provided - onSuccess and onFailure

    $('.pin-wrapper').validatePin({
        onSuccess: function () {
            --success code goes here--
        },
        onFailure: function () {
            --failure code goes here--
        }
    });

*/
import { translate } from '../i18n/translation.js';
import { cloneObject } from './dom.js';
import { displayFullMessage, getContainersInput, MESSAGE_PROPERTIES } from './messages.js';
import { confirmAction } from '../pages/edit-trip/categories/basic-data/protected-data.js';

(function ($) {
	//Declare our function
	$.fn.validatePin = function (options) {
		var defaults = {
			//Default Settings
			numericKeyboardOnMobile: false,
			blurOnSuccess: false,

			//Declaring our callback functions
			onSuccess: function () {},
			onFailure: function () {},
		};

		var settings = $.extend({}, defaults, options);

		//Cache the DOM into a jquery object so that repetitive scanning of DOM won't be necessary
		var $wrapper = $(this),
			$el = $wrapper.find('[data-role="pin"]'),
			$elCount = $wrapper.find('[data-role="pin"]').length;
		var pin: any = '';

		$el.each(function () {
			pin += '.';
		});

		//Event Initializations
		bindEvents();

		//Function Declarations
		function bindEvents() {
			$($el).on('focus', function () {
				selectText(this);
			});

			if (checkForMobileDevices()) {
				$($el).on('keyup', function (e) {
					var $that = this;
					validateUserInput(e, $that, 'keypress');
				});
			} else {
				$($el).on('keypress', function (e) {
					var $that = this;
					setTimeout(function () {
						validateUserInput(e, $that, 'keypress');
					}, 0);
				});
			}
			$($el).on('keydown', function (e) {
				var $that = this;
				setTimeout(function () {
					validateUserInput(e, $that, 'keydown');
				}, 0);
			});
		}

		//Select the text in an input field
		function selectText(obj) {
			var value = $(obj).val();
			if (!checkForMobileDevices() && $.trim(value) != '') {
				$(obj).select();
			}
		}

		//Validate User Input
		function validateUserInput(e, obj, event) {
			var keycode = e.charCode || e.keyCode || e.which;
			var prevInput = $(obj).prev('[data-role="pin"]'),
				nextInput = $(obj).next('[data-role="pin"]'),
				index = $(obj).index(),
				value = $(obj).val(),
				empty;

			if (event == 'keydown') {
				//Case - User Hits Left Arrow
				if (keycode === 37) {
					$(prevInput).focus();
					selectText(prevInput);
				} else if (keycode === 39) {
					//Case - User Hits Right Arrow
					$(nextInput).focus();
					selectText(nextInput);
				}

				if ($.trim(value) == '') {
					if (keycode === 8) {
						$(prevInput).focus();
						settings.onFailure.call(this);
					}
				} else {
					return false;
				}
			}

			if (event == 'keypress') {
				if (keycode == 0) {
					return false;
				}

				//Case - User Enters an alphabet or a special character
				if ((keycode >= 65 && keycode <= 90) || (keycode >= 186 && keycode <= 222)) {
					e.preventDefault();
				}

				//Case - User enters a number from the main keypad or the numpad
				if ((keycode >= 48 && keycode <= 57) || (keycode >= 96 && keycode <= 105)) {
					pin = $.trim(pin.replace(/\s/g, ''));
					pin = pin.split('');
					pin[index] = value;
					pin = pin.join('');

					$(nextInput).focus();

					if (!checkForMobileDevices()) {
						setTimeout(function () {
							$(obj).val('•');
						}, 200);
					} else {
						$(obj).val('•');
					}
				}

				var empty = $($el).filter(function () {
					return this.value === '';
				});

				if (empty.length) {
					settings.onFailure.call(this);
				} else {
					settings.onSuccess.call(this);
					//Check if the user wants to move the focus out of the inputs on success
					if (settings.blurOnSuccess) {
						$($el).blur();
					}
				}
			}

			//Check if default settings have been overrided by the user

			//Prompts a numberic keyboard on mobile
		}

		function checkForMobileDevices() {
			if (
				/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
			) {
				return true;
			} else {
				return false;
			}
		}

		if (settings.numericKeyboardOnMobile) {
			if (checkForMobileDevices()) {
				$el.prop('type', 'tel');
			}
		}
	};
})(jQuery);

function loadPin() {
	// Track actual digits via keydown — the validatePin plugin replaces input
	// values with "•" bullets, so we must capture the real digits before masking.
	const actualDigits: string[] = ['', '', '', ''];
	const pinWrapper = document.querySelector('.pin-wrapper')!;
	pinWrapper.addEventListener('keydown', (e: KeyboardEvent) => {
		const target = e.target as HTMLInputElement;
		if (target.getAttribute('data-role') !== 'pin') return;
		const inputs = Array.from(pinWrapper.querySelectorAll<HTMLInputElement>('[data-role="pin"]'));
		const index = inputs.indexOf(target);
		if (index < 0) return;

		if (e.key >= '0' && e.key <= '9') {
			actualDigits[index] = e.key;
		} else if (e.key === 'Backspace' || e.key === 'Delete') {
			actualDigits[index] = '';
		}
	});

	$('.pin-wrapper').validatePin({
		numericKeyboardOnMobile: true,
		blurOnSuccess: true,
		onSuccess: function () {
			$('.pin').html(actualDigits.join(''));
		},
		onFailure: function () {
			$('.pin').html('');
		},
	});
}

export function requestPin({ confirmAction, cancelAction, precontent, invalid = false }) {
	if (precontent === undefined) {
		precontent = translate('trip.basic_information.pin.request');
	}
	const properties = cloneObject(MESSAGE_PROPERTIES);
	const classComplement = invalid ? '-invalid' : '';
	properties.title = translate('trip.basic_information.pin.title');
	properties.content = `${precontent}<div class="pin-wrapper">
                                <input type="text" data-role="pin" maxlength="1" class="pin-input${classComplement}">
                                <input type="text" data-role="pin" maxlength="1" class="pin-input${classComplement}">
                                <input type="text" data-role="pin" maxlength="1" class="pin-input${classComplement}">
                                <input type="text" data-role="pin" maxlength="1" class="pin-input${classComplement}">
                              </div>
                              <div id="pin-code" class="pin"></div>`;
	properties.critical = true;
	// PIN dialogs must be dismissed via their Confirm / Cancel buttons — never
	// via the corner X (cancel-icon) or Escape.
	properties.closeButton = false;
	properties.containers = getContainersInput();
	properties.buttons = [];

	if (cancelAction) {
		properties.buttons.push({
			type: 'cancel',
			action: cancelAction,
		});
	}

	properties.buttons.push({
		type: 'confirm',
		action: confirmAction,
	});

	displayFullMessage(properties);
	loadPin();
}

export function requestInvalidPin({ confirmAction, cancelAction, precontent }) {
	const invalid = true;
	if (precontent === undefined) {
		precontent = translate('trip.basic_information.pin.invalid');
	}
	requestPin({ confirmAction, cancelAction, precontent, invalid });
}

export function setManualPin(pinString) {
	if (!/^\d{4}$/.test(pinString)) return;

	const inputs = document.querySelectorAll<HTMLInputElement>('.pin-wrapper [data-role="pin"]');
	if (inputs.length !== 4) return;

	inputs.forEach((input) => {
		input.value = '•';
	});

	document.querySelector('.pin')!.innerHTML = pinString;
}
