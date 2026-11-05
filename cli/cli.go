package cli

import (
	"flag"
	"path/filepath"
)

type Args struct {
	DataFolder string
	Config     string
	ConfigSet  bool
}

func Parse(argv []string) (Args, error) {
	fs := flag.NewFlagSet("volta", flag.ContinueOnError)
	var dataFolder, dataFolderCamel, config string
	fs.StringVar(&dataFolder, "data-folder", "./data", "data folder")
	fs.StringVar(&dataFolderCamel, "dataFolder", "", "data folder (legacy camelCase)")
	fs.StringVar(&config, "config", "", "config file path")
	fs.StringVar(&config, "configFile", "", "config file path (legacy camelCase)")
	if err := fs.Parse(argv); err != nil {
		return Args{}, err
	}
	if dataFolderCamel != "" {
		dataFolder = dataFolderCamel
	}
	a := Args{DataFolder: dataFolder, Config: config, ConfigSet: config != ""}
	return a, nil
}

func (a Args) ResolvedConfigPath() string {
	if a.ConfigSet {
		return a.Config
	}
	return filepath.Join(a.DataFolder, "server.toml")
}
