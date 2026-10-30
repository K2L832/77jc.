const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    StringSelectMenuBuilder, 
    PermissionsBitField 
} = require('discord.js');
const http = require('http');

// Serveur HTTP pour maintenir Render actif 24/7
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('K2L Ultimate Bot Operational!\nexisting system active\n');
}).listen(PORT, () => console.log(`Serveur HTTP actif sur le port ${PORT}`));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ]
});

const PREFIX = '='; // Utilisation du préfixe "=" visible sur tes screens
const OWNER_ID = '1166445202148442112'; // Ton ID exclusif (77jc)

client.on('ready', () => {
    console.log(`Bot connecté en tant que ${client.user.tag} ! Prêt pour l'action.`);
});

client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;

    // ==========================================
    // 1. COMMANDE DMALL SÉCURISÉE (Exclusif Owner + Boutons)
    // ==========================================
    if (message.content.startsWith(`!dmall`)) {
        if (message.author.id !== OWNER_ID) {
            return message.reply("❌ Tu n'as pas la permission d'utiliser cette commande.");
        }

        await message.reply("💬 **[DMAll Sécurisé]** Envoie dans ce salon le message que tu souhaites diffuser (variables: `{mention}`, `{name}`). *Tu as 60 secondes.*");

        const filter = m => m.author.id === OWNER_ID;
        const collector = message.channel.createMessageCollector({ filter, time: 60000, max: 1 });

        collector.on('collect', async m => {
            const messageTemplate = m.content;

            const previewEmbed = new EmbedBuilder()
                .setColor('#FEE75C')
                .setTitle('⚠️ Confirmation requise - DMAll')
                .setDescription(`Voici le message qui va être diffusé :\n\n\`\`\`${messageTemplate}\`\`\``)
                .setFooter({ text: `Demandé par ${message.author.tag}` });

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('confirm_dmall')
                        .setLabel('Confirmer l\'envoi')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('cancel_dmall')
                        .setLabel('Annuler')
                        .setStyle(ButtonStyle.Danger)
                );

            const confirmMsg = await message.channel.send({ embeds: [previewEmbed], components: [row] });

            const buttonFilter = i => i.user.id === OWNER_ID;
            const buttonCollector = confirmMsg.createMessageComponentCollector({ filter: buttonFilter, time: 60000, max: 1 });

            buttonCollector.on('collect', async interaction => {
                if (interaction.customId === 'cancel_dmall') {
                    await interaction.update({ content: "❌ **Diffusion DMAll annulée.**", embeds: [], components: [] });
                    return;
                }

                if (interaction.customId === 'confirm_dmall') {
                    await interaction.update({ content: "🚀 **Diffusion DMAll lancée en temps réel !**", embeds: [], components: [] });

                    const initialEmbed = new EmbedBuilder()
                        .setColor('#5865F2')
                        .setTitle('🚀 Diffusion en cours...')
                        .addFields(
                            { name: '👥 Total', value: 'Calcul...', inline: true },
                            { name: '✅ Envoyés', value: '0', inline: true },
                            { name: '❌ Erreurs', value: '0', inline: true },
                            { name: '📊 Progression', value: '0%', inline: true }
                        );

                    const statusMsg = await message.channel.send({ embeds: [initialEmbed] });

                    try {
                        await message.guild.members.fetch();
                        const members = message.guild.members.cache.filter(member => !member.user.bot);
                        const totalMembers = members.size;

                        let successCount = 0;
                        let failCount = 0;
                        let processed = 0;

                        for (const [id, member] of members) {
                            try {
                                const finalMessage = messageTemplate
                                    .replace(/\{mention\}/g, `<@${member.id}>`)
                                    .replace(/\{name\}/g, member.user.username);

                                await member.send(finalMessage);
                                successCount++;
                            } catch (err) {
                                failCount++;
                            }

                            processed++;
                            const percent = Math.round((processed / totalMembers) * 100);

                            if (processed % 5 === 0 || processed === totalMembers) {
                                const updateEmbed = new EmbedBuilder()
                                    .setColor('#5865F2')
                                    .setTitle('🚀 Diffusion en cours...')
                                    .addFields(
                                        { name: '👥 Total cibles', value: `${totalMembers}`, inline: true },
                                        { name: '✅ Envoyés', value: `${successCount}`, inline: true },
                                        { name: '❌ Échecs (MPs fermés)', value: `${failCount}`, inline: true },
                                        { name: '📊 Progression', value: `${percent}% (${processed}/${totalMembers})`, inline: false }
                                    );

                                await statusMsg.edit({ embeds: [updateEmbed] }).catch(() => {});
                            }

                            await new Promise(resolve => setTimeout(resolve, 1000)); // Anti-rate limit 1s
                        }

                        const finalEmbed = new EmbedBuilder()
                            .setColor('#00FF00')
                            .setTitle('✅ Diffusion DMAll Terminée !')
                            .addFields(
                                { name: '👥 Total', value: `${totalMembers}`, inline: true },
                                { name: '✅ Succès', value: `${successCount}`, inline: true },
                                { name: '❌ Échecs', value: `${failCount}`, inline: true }
                            );

                        await statusMsg.edit({ embeds: [finalEmbed] });

                    } catch (error) {
                        console.error(error);
                        message.channel.send("❌ Erreur critique lors de la récupération des membres.");
                    }
                }
            });
        });
    }

    // ==========================================
    // 2. COMMANDE =HELP INTERACTIVE (Basée sur tes screens)
    // ==========================================
    if (message.content.startsWith(`${PREFIX}help`)) {
        const getSanctionsEmbed = () => new EmbedBuilder()
            .setColor('#2B2D31')
            .setTitle('🛠️ Sanctions')
            .setDescription(
                '`=bl <@membre|pseudo|id> [raison]`\n└ Bannir (blacklist), par mention/pseudo ou ID (même hors serveur)\n\n' +
                '`=unbl <user_id>`\n└ Débannir un utilisateur par son ID\n\n' +
                '`=blist`\n└ Lister tous les membres bannis\n\n' +
                '`=unbanall`\n└ Débannir tout le monde (admin, confirmation)\n\n' +
                '`=kick <membre> [raison]`\n└ Expulser un membre\n\n' +
                '`=softbl <membre> [raison]`\n└ Ban + déban immédiat (efface les msgs)'
            )
            .setFooter({ text: `Demandé par ${message.author.username} • Page 1/3 • 15 commande(s)` });

        const getNettoyageEmbed = () => new EmbedBuilder()
            .setColor('#2B2D31')
            .setTitle('🧹 Nettoyage')
            .setDescription(
                '`=clear <nombre|all>`\n└ Supprimer N messages ou tous dans le salon\n\n' +
                '`=purge <membre> [nombre]`\n└ Supprimer les messages d\'un membre\n\n' +
                '`=snipe [@membre]`\n└ Voir les messages supprimés récents'
            )
            .setFooter({ text: `Demandé par ${message.author.username} • Page 2/3 • 3 commande(s)` });

        const getSalonsEmbed = () => new EmbedBuilder()
            .setColor('#2B2D31')
            .setTitle('🔒 Salons')
            .setDescription(
                '`=lock [salon]`\n└ Verrouiller un salon\n\n' +
                '`=unlock [salon]`\n└ Déverrouiller un salon\n\n' +
                '`=slowmode <sec> [salon]`\n└ Définir le slowmode\n\n' +
                '`=nuke [salon]`\n└ Recréer un salon (efface tout)\n\n' +
                '`=createtext <nom> [catégorie]`\n└ Créer un salon textuel\n\n' +
                '`=createvoice <nom> [catégorie]`\n└ Créer un salon vocal'
            )
            .setFooter({ text: `Demandé par ${message.author.username} • Page 3/3 • 6 commande(s)` });

        const rowMenu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('help_menu')
                .setPlaceholder('📁 Choisir une catégorie...')
                .addOptions([
                    { label: 'Sanctions', value: 'sanctions', emoji: '🛠️' },
                    { label: 'Nettoyage', value: 'nettoyage', emoji: '🧹' },
                    { label: 'Salons', value: 'salons', emoji: '🔒' }
                ])
        );

        const helpMsg = await message.reply({ embeds: [getSanctionsEmbed()], components: [rowMenu] });

        const collector = helpMsg.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', async i => {
            if (i.user.id !== message.author.id) {
                return i.reply({ content: "❌ Ce menu ne t'appartient pas.", ephemeral: true });
            }

            if (i.values[0] === 'sanctions') await i.update({ embeds: [getSanctionsEmbed()] });
            if (i.values[0] === 'nettoyage') await i.update({ embeds: [getNettoyageEmbed()] });
            if (i.values[0] === 'salons') await i.update({ embeds: [getSalonsEmbed()] });
        });
    }
      // ==========================================
    // 3. COMMANDES DE MODÉRATION & SÉCURITÉ
    // ==========================================

    // Commande =bl (Blacklist / Ban)
    if (message.content.startsWith(`${PREFIX}bl `)) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return message.reply("❌ Tu n'as pas la permission de bannir des membres.");
        }
        const args = message.content.split(' ').slice(1);
        const targetInput = args[0];
        const reason = args.slice(1).join(' ') || 'Aucune raison spécifiée';

        let targetId = targetInput.replace(/<@!?([0-9]+)>/, '$1');

        try {
            await message.guild.members.ban(targetId, { reason });
            await message.reply(`✅ L'utilisateur \`${targetId}\` a été banni avec succès. Raison : ${reason}`);
        } catch (err) {
            await message.reply("❌ Impossible de bannir cet utilisateur (ID invalide ou permissions insuffisantes).");
        }
    }

    // Commande =unbl (Débannir par ID)
    if (message.content.startsWith(`${PREFIX}unbl `)) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return message.reply("❌ Tu n'as pas la permission de débannir des membres.");
        }
        const args = message.content.split(' ').slice(1);
        const userId = args[0];

        try {
            await message.guild.members.unban(userId);
            await message.reply(`✅ L'utilisateur \`${userId}\` a été débanni avec succès.`);
        } catch (err) {
            await message.reply("❌ Impossible de trouver cet utilisateur dans les bannis.");
        }
    }

    // Commande =kick (Expulser)
    if (message.content.startsWith(`${PREFIX}kick `)) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            return message.reply("❌ Tu n'as pas la permission d'expulser des membres.");
        }
        const member = message.mentions.members.first() || message.guild.members.cache.get(message.content.split(' ')[1]);
        const reason = message.content.split(' ').slice(2).join(' ') || 'Aucune raison';

        if (!member) return message.reply("❌ Mentionne un membre valide à expulser.");

        try {
            await member.kick(reason);
            await message.reply(`✅ ${member.user.tag} a été expulsé. Raison : ${reason}`);
        } catch (err) {
            await message.reply("❌ Je n'ai pas les permissions pour expulser ce membre.");
        }
    }

    // ==========================================
    // 4. COMMANDES DE NETTOYAGE
    // ==========================================

    // Commande =clear
    if (message.content.startsWith(`${PREFIX}clear`)) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return message.reply("❌ Tu n'as pas la permission de gérer les messages.");
        }
        const args = message.content.split(' ');
        const amount = args[1];

        await message.delete().catch(() => {});

        if (amount === 'all') {
            let fetched;
            do {
                fetched = await message.channel.messages.fetch({ limit: 100 });
                await message.channel.bulkDelete(fetched, true).catch(() => {});
            } while (fetched.size >= 2);
            return message.channel.send("🧹 Salon nettoyé en totalité.").then(msg => setTimeout(() => msg.delete().catch(()=>{}), 3000));
        }

        const count = parseInt(amount);
        if (isNaN(count) || count <= 0 || count > 100) {
            return message.reply("❌ Indique un nombre entre 1 et 100 ou `all`.").then(msg => setTimeout(() => msg.delete().catch(()=>{}), 3000));
        }

        try {
            const deleted = await message.channel.bulkDelete(count, true);
            message.channel.send(`🧹 ${deleted.size} messages supprimés.`).then(msg => setTimeout(() => msg.delete().catch(()=>{}), 3000));
        } catch (err) {
            message.reply("❌ Erreur lors de la suppression (les messages de plus de 14 jours ne peuvent pas être supprimés en masse).");
        }
    }

    // ==========================================
    // 5. COMMANDES DE SALONS & SÉCURITÉ
    // ==========================================

    // Commande =lock (Verrouiller le salon)
    if (message.content.startsWith(`${PREFIX}lock`)) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return message.reply("❌ Tu n'as pas la permission de gérer les salons.");
        }
        try {
            await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
            await message.reply("🔒 Ce salon a été verrouillé.");
        } catch (err) {
            await message.reply("❌ Erreur lors du verrouillage.");
        }
    }

    // Commande =unlock (Déverrouiller le salon)
    if (message.content.startsWith(`${PREFIX}unlock`)) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return message.reply("❌ Tu n'as pas la permission de gérer les salons.");
        }
        try {
            await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: null });
            await message.reply("🔓 Ce salon a été déverrouillé.");
        } catch (err) {
            await message.reply("❌ Erreur lors du déverrouillage.");
        }
    }

    // Commande =nuke (Recréer le salon à l'identique)
    if (message.content.startsWith(`${PREFIX}nuke`)) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return message.reply("❌ Tu n'as pas la permission de nuke ce salon.");
        }
        try {
            const position = message.channel.position;
            const newChannel = await message.channel.clone();
            await message.channel.delete();
            newChannel.setPosition(position);
            newChannel.send("💥 **Salon nuke avec succès !** Tout est propre.");
        } catch (err) {
            await message.reply("❌ Erreur lors du nuke du salon.");
        }
    }
});

// Connexion du bot avec le token sécurisé de Render
client.login(process.env.DISCORD_TOKEN);
