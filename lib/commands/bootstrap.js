/**
 * @license Copyright (c) 2003-2017, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

'use strict';

const fs = require( 'fs' );
const path = require( 'path' );
const exec = require( '../utils/exec' );
const parseRepository = require( '../utils/parse-repository' );

module.exports = {
	/**
	 * @param {Object} data
	 * @param {Object} data.options Additional options provided by user.
	 * @param {String} data.options.recursive Whether to install dependencies of packages.
	 * @param {String} data.options.repositoryResolver Module which will resolve repositories for packages.
	 * @param {String} data.options.cwd Current work directory.
	 * @param {String} data.name Name of current package that will be parsed.
	 * @param {Object} data.mgit MGit configuration.
	 * @param {Object} data.mgit.packages Destination directory where packages will be installed.
	 * @returns {Promise}
	 */
	execute( data ) {
		const log = require( '../utils/log' )();

		return new Promise( ( resolve, reject ) => {
			const destinationPath = path.join( data.options.cwd, data.mgit.packages, data.name );

			// Package is already cloned.
			if ( fs.existsSync( destinationPath ) ) {
				log.info( `Package "${ data.name }" is already cloned. Skipping...` );

				return resolve( { logs: log.all() } );
			}

			const repositoryResolver = require( data.options.repositoryResolver );
			const repositoryName = repositoryResolver( data.name, data.options.cwd );

			// The repository was not found then the package is skipped.
			if ( !repositoryName ) {
				log.error( `Cannot find repository for package "${ data.name }". Skipped.` );

				return reject( { logs: log.all() } );
			}

			const repo = parseRepository( repositoryName );

			if ( !repo ) {
				log.error( `Repository "${ repositoryName}" for package "${ data.name }" is invalid. Skipped.` );

				return reject( { logs: log.all() } );
			}

			//jscs:disable maximumLineLength
			const command = `git clone -b ${ repo.branch } git@${ repo.host }:${ repo.repository }.git ${ destinationPath } --progress`;
			//jscs:enable maximumLineLength

			exec( command )
				.then( ( output ) => {
					log.info( output );

					const response = {
						logs: log.all()
					};

					if ( data.options.recursive ) {
						const packageJson = require( path.join( destinationPath, 'package.json' ) );

						response.packages = packageJson.dependencies ? Object.keys( packageJson.dependencies ) : [];
					}

					resolve( response );
				} )
				.catch( ( err ) => {
					log.error( err );

					reject( { logs: log.all() } );
				} );
		} );
	},

	/**
	 * @param {Set} parsedPackages Collection of processed packages.
	 */
	afterExecute( parsedPackages ) {
		console.log( `${ parsedPackages.size } packages have been processed.` );
	}
};