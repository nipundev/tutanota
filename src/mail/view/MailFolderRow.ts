import m, { Children, Component, Vnode } from "mithril"
import type { NavButtonAttrs } from "../../gui/base/NavButton.js"
import { isNavButtonSelected, NavButton } from "../../gui/base/NavButton.js"
import { CounterBadge } from "../../gui/base/CounterBadge"
import { getNavButtonIconBackground, theme } from "../../gui/theme"
import { px, size } from "../../gui/size"
import { IconButton, IconButtonAttrs } from "../../gui/base/IconButton.js"
import { AllIcons, Icon } from "../../gui/base/Icon.js"
import { Icons } from "../../gui/base/icons/Icons.js"
import { stateBgHover } from "../../gui/builtinThemes.js"
import { client } from "../../misc/ClientDetector.js"
import { lang } from "../../misc/LanguageViewModel.js"

export type MailFolderRowAttrs = {
	count: number
	button: NavButtonAttrs
	rightButton?: IconButtonAttrs | null
	expanded: boolean | null
	indentationLevel: number
	onExpanderClick: () => unknown
	icon: AllIcons
	hasChildren: boolean
	onSelectedPath: boolean
	numberOfPreviousRows: number
	isLastSibling: boolean
	editMode: boolean
	onHover: () => void
}

export class MailFolderRow implements Component<MailFolderRowAttrs> {
	private rightButtonClicked: boolean = false
	private hovered: boolean = false

	onupdate(vnode: Vnode<MailFolderRowAttrs>): any {
		if (isNavButtonSelected(vnode.attrs.button)) {
			this.hovered = true
		}
	}

	view(vnode: Vnode<MailFolderRowAttrs>): Children {
		const { count, button, rightButton, expanded, indentationLevel, icon, hasChildren, editMode } = vnode.attrs
		const onHover = () => {
			vnode.attrs.onHover()
			this.hovered = true
		}

		// because onblur is fired upon changing folder due to the route change
		// these functions can be used to handle keyboard navigation
		const handleForwardsTab = (event: KeyboardEvent) => {
			if (event.key === "Tab" && !event.shiftKey) {
				this.hovered = false
			}
		}
		const handleBackwardsTab = (event: KeyboardEvent) => {
			if (event.key === "Tab" && event.shiftKey) this.hovered = false
		}

		const indentationMargin = indentationLevel * size.hpad
		const paddingNeeded = size.hpad_button
		const buttonWidth = size.icon_size_large + paddingNeeded * 2

		return m(
			".folder-row.flex.flex-row.mlr-button.border-radius-small" + (editMode ? "" : ".state-bg"),
			{
				style: {
					background: isNavButtonSelected(button) ? stateBgHover : "",
				},
				title: lang.getMaybeLazy(button.label),
				onmouseenter: onHover,
				onmouseleave: () => {
					if (!this.rightButtonClicked) {
						this.hovered = false
					}
				},
			},
			[
				hasChildren && !expanded
					? m(Icon, {
							style: {
								position: "absolute",
								bottom: px(9),
								left: px(5 + indentationMargin + buttonWidth / 2),
								fill: isNavButtonSelected(button) ? theme.navigation_button_selected : theme.navigation_button,
							},
							icon: Icons.Add,
							class: "icon-small",
					  })
					: null,
				m("", {
					style: {
						marginLeft: px(indentationMargin),
					},
				}),
				this.renderHierarchyLine(vnode.attrs, indentationMargin),
				m(
					"button.flex.items-center.justify-end" + (editMode || !hasChildren ? ".no-hover" : ""),
					{
						style: {
							left: px(indentationMargin),
							width: px(buttonWidth),
							height: px(size.button_height),
							paddingLeft: px(paddingNeeded),
							paddingRight: px(paddingNeeded),
							// the zIndex is so the hierarchy lines never get drawn over the icon
							zIndex: 3,
						},
						onclick: vnode.attrs.onExpanderClick,
						onkeydown: handleBackwardsTab,
					},
					m(Icon, {
						icon,
						large: true,
						style: {
							fill: isNavButtonSelected(button) ? theme.navigation_button_selected : theme.navigation_button,
						},
					}),
				),
				m(NavButton, {
					...button,
					onfocus: onHover,
					onblur: () => {
						// The setTimout is so that there is some time to tab to the rightButton
						// otherwise it disappears immediately and is unreachable on keyboard
						setTimeout(() => {
							this.hovered = false
						}, 5)
					},
					onkeydown: handleBackwardsTab,
				}),
				// show the edit button in either edit mode or on hover (excluding hover on mobile)
				rightButton && (editMode || (!client.isMobileDevice() && this.hovered))
					? m(IconButton, {
							...rightButton,
							onblur: () => {
								this.rightButtonClicked = false
								m.redraw()
							},
							click: (event, dom) => {
								// Don't ask me why, but you need to set this to true twice
								// to have hovering off the folder row work correctly on web
								// certified JavaScript moment™
								this.rightButtonClicked = true
								rightButton.click(event, dom)
								this.rightButtonClicked = true
							},
							onkeydown: handleForwardsTab,
					  })
					: m("", { style: { marginRight: px(size.hpad_button) } }, [
							m(CounterBadge, {
								count,
								color: theme.navigation_button_icon,
								background: getNavButtonIconBackground(),
								showFullCount: true,
							}),
					  ]),
			],
		)
	}

	private renderHierarchyLine({ indentationLevel, numberOfPreviousRows, isLastSibling, onSelectedPath }: MailFolderRowAttrs, indentationMargin: number) {
		const lineSize = 2
		const border = `${lineSize}px solid ${theme.content_border}`
		const verticalOffsetInsideRow = size.button_height / 2 + 1
		const verticalOffsetForParent = (size.button_height - size.icon_size_large) / 2
		const lengthOfHorizontalLine = size.hpad - 2
		const leftOffset = indentationMargin

		return indentationLevel !== 0
			? [
					isLastSibling || onSelectedPath
						? // draw both vertical and horizontal lines
						  m(".abs", {
								style: {
									width: px(lengthOfHorizontalLine),
									borderBottomLeftRadius: "3px",
									// there's some subtle difference between border we use here and the top for the other element and this +1 is to
									// accommodate it
									height: px(1 + verticalOffsetInsideRow + verticalOffsetForParent + numberOfPreviousRows * size.button_height),
									top: px(-verticalOffsetForParent - numberOfPreviousRows * size.button_height),
									left: px(leftOffset),
									borderLeft: border,
									borderBottom: border,
									// we need to draw selected lines over everything else, even things that are drawn later
									zIndex: onSelectedPath ? 2 : 1,
								},
						  })
						: // draw only the horizontal line
						  m(".abs", {
								style: {
									height: px(lineSize),
									top: px(verticalOffsetInsideRow),
									left: px(leftOffset),
									width: px(lengthOfHorizontalLine),
									backgroundColor: theme.content_border,
								},
						  }),
			  ]
			: null
	}
}
