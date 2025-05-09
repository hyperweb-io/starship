package e2e

// addresses is a map with type of chain and list of test addresses
var addresses = map[string][]string{
	"osmosis": {
		"osmo14lzvt4gdwh2q4ymyjqma0p4j4aykpn929zx75y",
		"osmo1clpqr4nrk4khgkxj78fcwwh6dl3uw4epasmvnj",
		"osmo15urq2dtp9qce4fyc85m6upwm9xul30495qdm4l",
	},
	"custom": {
		"osmo14lzvt4gdwh2q4ymyjqma0p4j4aykpn929zx75y",
		"osmo1clpqr4nrk4khgkxj78fcwwh6dl3uw4epasmvnj",
		"osmo15urq2dtp9qce4fyc85m6upwm9xul30495qdm4l",
	},
	"cosmoshub": {
		"cosmos1c4k24jzduc365kywrsvf5ujz4ya6mwymy8vq4q",
		"cosmos196ax4vc0lwpxndu9dyhvca7jhxp70rmcfhxsrt",
		"cosmos1t5u0jfg3ljsjrh2m9e47d4ny2hea7eehxrzdgd",
	},
	"simapp": {
		"cosmos1c4k24jzduc365kywrsvf5ujz4ya6mwymy8vq4q",
		"cosmos196ax4vc0lwpxndu9dyhvca7jhxp70rmcfhxsrt",
		"cosmos1t5u0jfg3ljsjrh2m9e47d4ny2hea7eehxrzdgd",
	},
	"persistencecore": {
		"persistence13frxdtypzz722wy3ylzlmh8tqcyje8lhtuhkfc",
		"persistence1rq598kexpsdmhxq63qq74v3tf22u6yvl2a47xk",
		"persistence1tzn8rk09ez2gm55sffpyzt7ccn5yzshpfm8743",
	},
	"evmos": {
		"evmos1sp9frqwep52chwavv3xd776myy8gyyvkp6n53z",
		"evmos1zwr06uz8vrwkcnd05e5yddamvghn93a467tf0q",
		"evmos1f35jtt5m68zlxkpxn75403vv82cchahqp8lnau",
	},
	"injective": {
		"inj1acgud5qpn3frwzjrayqcdsdr9vkl3p6h5yys25",
		"inj1hsxaln75wjs033t3spd8a0gawl4jvxawyuez5p",
		"inj1lsuqpgm8kgwpq96ewyew26xnfwyn3lh3y7knzj",
	},
	"xpla": {
		"xpla1sp9frqwep52chwavv3xd776myy8gyyvkau6xqe",
		"xpla1zwr06uz8vrwkcnd05e5yddamvghn93a4xczm7m",
		"xpla1f35jtt5m68zlxkpxn75403vv82cchahqapkpv8",
	},
}

func getAddressFromType(chainType string) string {
	return addresses[chainType][0]
}
